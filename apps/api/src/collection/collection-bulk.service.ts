import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import {
  CardState,
  CardStateCode,
} from "src/card-state/entities/card-state.entity";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { ProductKind } from "src/common/enums/product-kind";
import { SealedCondition } from "src/common/enums/sealed-condition";
import { UserRole } from "src/common/enums/user";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import { User } from "src/user/entities/user.entity";
import { DataSource, EntityManager, In, IsNull, Repository } from "typeorm";
import {
  BulkDeleteDto,
  BulkMoveDto,
  ImportCsvDto,
  ImportMode,
  ImportResultDto,
  UndoOperationDto,
  UndoResultDto,
} from "./dto/collection-bulk.dto";
import {
  BulkOperationKind,
  BulkOperationStatus,
  CollectionBulkOperation,
  CollectionBulkOperationLine,
} from "./entities/collection-bulk-operation.entity";
import { Collection } from "./entities/collection.entity";

/** Version of the CSV column contract this service exports and understands. */
const CSV_SCHEMA_VERSION = 2;

/** Columns of the portable inventory CSV, matched by name on import. */
const CSV_HEADERS = [
  "schemaVersion",
  "id",
  "productKind",
  "cardId",
  "tcgDexId",
  "cardName",
  "setName",
  "localId",
  "sealedProductId",
  "variant",
  "language",
  "printing",
  "cardState",
  "sealedCondition",
  "quantity",
  "quantityAvailable",
  "quantityReserved",
  "quantitySold",
  "acquisitionCost",
  "acquisitionCurrency",
  "acquiredAt",
  "storageLocation",
  "notes",
  "photoUrls",
] as const;

/**
 * Physical identity of an inventory row, which decides whether an imported row
 * updates an existing item or creates one.
 */
interface RowIdentity {
  productKind: ProductKind;
  card: Card | null;
  sealedProduct: SealedProduct | null;
  variant: string;
  language: string;
  printing: string | null;
  cardState: CardState | null;
  sealedCondition: SealedCondition | null;
}

@Injectable()
export class CollectionBulkService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    @InjectRepository(CollectionItem)
    private readonly itemRepo: Repository<CollectionItem>,
    @InjectRepository(Card)
    private readonly cardRepo: Repository<Card>,
    @InjectRepository(CardState)
    private readonly cardStateRepo: Repository<CardState>,
    @InjectRepository(CollectionBulkOperation)
    private readonly operationRepo: Repository<CollectionBulkOperation>,
    private readonly dataSource: DataSource,
  ) {}

  private assertOwner(
    collection: Collection,
    userId: number,
    role?: UserRole,
  ): void {
    if (collection.user?.id !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que vos propres collections",
      );
    }
  }

  /**
   * Escapes cell text to prevent spreadsheet formula injection (CSV Injection).
   *
   * Prepends a single quote if the cell begins with `=`, `+`, `-`, `@`, `\t`, or `\r`.
   */
  private escapeCsvCell(val: string | number | null | undefined): string {
    if (val === null || val === undefined) return "";
    let str = String(val);

    // Escape formula injection characters
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // Wrap in quotes if containing comma, newline or double quotes
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Generates a formula-safe CSV of collection inventory (COL-04).
   *
   * Columns are the contract: an importer matches them by name, so a file can
   * gain columns without breaking older readers. Values that contain commas,
   * quotes or newlines are quoted and survive a round trip.
   *
   * @param collectionId Target collection ID.
   * @param viewer Requesting user.
   * @returns Formatted CSV content string.
   */
  async exportCsv(collectionId: string, viewer?: User): Promise<string> {
    const collection = await this.collectionRepo.findOne({
      where: { id: collectionId },
      relations: ["user"],
    });

    if (!collection) {
      throw new NotFoundException(
        `Collection with id ${collectionId} not found`,
      );
    }

    if (
      !collection.isPublic &&
      collection.user?.id !== viewer?.id &&
      viewer?.role !== UserRole.ADMIN
    ) {
      throw new NotFoundException(
        `Collection with id ${collectionId} not found`,
      );
    }

    const items = await this.itemRepo.find({
      where: { collection: { id: collectionId } },
      relations: [
        "pokemonCard",
        "pokemonCard.set",
        "pokemonCard.translations",
        "sealedProduct",
        "cardState",
      ],
      order: { added_at: "ASC" },
    });

    const rows: string[] = [CSV_HEADERS.join(",")];

    for (const item of items) {
      const cardName =
        item.pokemonCard?.translations?.[0]?.name ||
        item.pokemonCard?.name ||
        (item.sealedProduct as { name?: string } | null)?.name ||
        item.sealedProduct?.id ||
        "";

      const setName =
        item.pokemonCard?.set?.id || item.sealedProduct?.pokemonSet?.id || "";

      const row = [
        CSV_SCHEMA_VERSION,
        item.id,
        item.productKind,
        item.pokemonCard?.id || "",
        item.pokemonCard?.tcgDexId || "",
        cardName,
        setName,
        item.pokemonCard?.localId || "",
        item.sealedProduct?.id || "",
        item.variant || "normal",
        item.language || "fr",
        item.printing || "",
        item.cardState?.code || "",
        item.sealedCondition || "",
        item.quantity,
        item.quantityAvailable,
        item.quantityReserved,
        item.quantitySold,
        item.acquisitionCost ?? "",
        item.acquisitionCurrency ?? "",
        item.acquiredAt ? item.acquiredAt.toISOString() : "",
        item.storageLocation ?? "",
        item.notes ?? "",
        item.photoUrls?.length ? JSON.stringify(item.photoUrls) : "",
      ];
      rows.push(row.map((cell) => this.escapeCsvCell(cell)).join(","));
    }

    return rows.join("\n");
  }

  /**
   * Imports inventory rows from a CSV string, recording what each row changed (COL-04).
   *
   * A row matches an existing item only when its complete physical identity
   * matches — product, variant, language, printing and condition — so importing
   * a second condition of the same card adds a stack instead of merging into it.
   * Every effect is recorded on a durable operation that {@link undoOperation}
   * compensates.
   *
   * @param collectionId Target collection ID.
   * @param user Authenticated user.
   * @param dto CSV import configuration.
   * @returns Detailed import summary.
   */
  async importCsv(
    collectionId: string,
    user: User,
    dto: ImportCsvDto,
  ): Promise<ImportResultDto> {
    const collection = await this.collectionRepo.findOne({
      where: { id: collectionId },
      relations: ["user"],
    });

    if (!collection) {
      throw new NotFoundException(
        `Collection with id ${collectionId} not found`,
      );
    }

    this.assertOwner(collection, user.id, user.role);

    const operationId =
      dto.operationId ||
      `import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const mode = dto.mode || ImportMode.ADD;

    // A replayed import answers from its recorded summary instead of applying
    // the rows a second time.
    const previous = await this.operationRepo.findOne({
      where: { collection: { id: collectionId }, operationId },
    });
    if (previous) {
      return {
        operationId,
        importedCount: Number(previous.summary?.importedCount ?? 0),
        updatedCount: Number(previous.summary?.updatedCount ?? 0),
        skippedCount: Number(previous.summary?.skippedCount ?? 0),
        errors: (previous.summary?.errors ?? []) as ImportResultDto["errors"],
      };
    }

    const rows = this.parseCsvRows(dto.csvContent);
    if (rows.length <= 1) {
      throw new BadRequestException(
        "Le fichier CSV est vide ou ne contient pas de données",
      );
    }

    const headerMap = new Map<string, number>();
    rows[0].forEach((header, index) =>
      headerMap.set(header.trim().replace(/^"|"$/g, "").toLowerCase(), index),
    );

    const defaultCardState =
      (await this.cardStateRepo.findOne({
        where: { code: CardStateCode.NM },
      })) || (await this.cardStateRepo.find())[0];

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    await this.dataSource.transaction(async (manager) => {
      const operation = await manager.save(
        CollectionBulkOperation,
        manager.create(CollectionBulkOperation, {
          collection,
          user,
          operationId,
          kind: BulkOperationKind.CSV_IMPORT,
          mode,
          status: BulkOperationStatus.APPLIED,
        }),
      );

      for (let index = 1; index < rows.length; index++) {
        const cells = rows[index];
        if (!cells.length || cells.every((cell) => !cell.trim())) continue;

        const getVal = (colName: string): string => {
          const idx = headerMap.get(colName.toLowerCase());
          if (idx === undefined || idx >= cells.length) return "";
          let val = cells[idx].trim();
          if (val.startsWith("'")) val = val.substring(1);
          return val;
        };

        const rawQty = parseInt(getVal("quantity"), 10);
        const quantity = Number.isNaN(rawQty) || rawQty < 1 ? 1 : rawQty;

        let identity: RowIdentity;
        try {
          identity = await this.resolveIdentity(
            manager,
            getVal,
            defaultCardState,
          );
        } catch (error) {
          errors.push({
            row: index + 1,
            reason:
              error instanceof Error ? error.message : "Ligne non reconnue",
          });
          skippedCount++;
          continue;
        }

        const existing = await manager.findOne(CollectionItem, {
          where: {
            collection: { id: collectionId },
            productKind: identity.productKind,
            ...(identity.card
              ? { pokemonCard: { id: identity.card.id } }
              : { pokemonCard: IsNull() }),
            ...(identity.sealedProduct
              ? { sealedProduct: { id: identity.sealedProduct.id } }
              : { sealedProduct: IsNull() }),
            variant: identity.variant,
            language: identity.language,
            ...(identity.printing
              ? { printing: identity.printing }
              : { printing: IsNull() }),
            ...(identity.cardState
              ? { cardState: { id: identity.cardState.id } }
              : {}),
            ...(identity.sealedCondition
              ? { sealedCondition: identity.sealedCondition }
              : {}),
          },
          relations: ["cardState"],
        });

        if (existing) {
          const committed =
            (existing.quantityReserved ?? 0) + (existing.quantitySold ?? 0);
          const previousQuantity = existing.quantity;
          const previousAvailable = existing.quantityAvailable;

          if (mode === ImportMode.REPLACE) {
            if (quantity < committed) {
              // Replacing below the committed copies would deny stock a listing
              // or a sale already holds.
              errors.push({
                row: index + 1,
                reason: `Quantité ${quantity} inférieure aux ${committed} copie(s) réservée(s) ou vendue(s) de l'item #${existing.id}`,
              });
              skippedCount++;
              continue;
            }
            existing.quantity = quantity;
            existing.quantityAvailable = quantity - committed;
          } else {
            existing.quantity += quantity;
            existing.quantityAvailable += quantity;
          }
          // Provenance stays the one of the operation that created the item, so
          // an earlier import keeps an accurate record of what it did.
          await manager.save(CollectionItem, existing);
          await manager.save(
            CollectionBulkOperationLine,
            manager.create(CollectionBulkOperationLine, {
              operation,
              collectionItem: existing,
              created: false,
              quantityDelta: existing.quantity - previousQuantity,
              availableDelta: existing.quantityAvailable - previousAvailable,
              previousQuantity,
              previousAvailable,
            }),
          );
          updatedCount++;
        } else {
          const acquisitionCost = Number.parseFloat(getVal("acquisitioncost"));
          const acquiredAt = getVal("acquiredat");
          const photoUrls = this.parseJsonArray(getVal("photourls"));

          const newItem = await manager.save(
            CollectionItem,
            manager.create(CollectionItem, {
              collection,
              productKind: identity.productKind,
              pokemonCard: identity.card,
              sealedProduct: identity.sealedProduct,
              cardState: identity.cardState,
              sealedCondition: identity.sealedCondition,
              variant: identity.variant,
              language: identity.language,
              printing: identity.printing,
              storageLocation: getVal("storagelocation") || null,
              notes: getVal("notes") || null,
              acquisitionCost: Number.isNaN(acquisitionCost)
                ? null
                : acquisitionCost,
              acquisitionCurrency: getVal("acquisitioncurrency") || null,
              acquiredAt: acquiredAt ? new Date(acquiredAt) : null,
              photoUrls,
              quantity,
              quantityAvailable: quantity,
              quantityReserved: 0,
              quantitySold: 0,
              provenance: {
                operationId,
                mode,
                source: "csv_import",
                importedAt: new Date().toISOString(),
              },
            }),
          );
          await manager.save(
            CollectionBulkOperationLine,
            manager.create(CollectionBulkOperationLine, {
              operation,
              collectionItem: newItem,
              created: true,
              quantityDelta: quantity,
              availableDelta: quantity,
              previousQuantity: 0,
              previousAvailable: 0,
            }),
          );
          importedCount++;
        }
      }

      operation.summary = {
        importedCount,
        updatedCount,
        skippedCount,
        errors,
      };
      await manager.save(CollectionBulkOperation, operation);
    });

    return {
      operationId,
      importedCount,
      updatedCount,
      skippedCount,
      errors,
    };
  }

  /**
   * Resolves the physical identity of one imported row.
   *
   * @throws Error When the row does not name a product this catalog knows.
   */
  private async resolveIdentity(
    manager: EntityManager,
    getVal: (column: string) => string,
    defaultCardState: CardState | undefined,
  ): Promise<RowIdentity> {
    const declaredKind = getVal("productkind").toLowerCase();
    const sealedProductId = getVal("sealedproductid");
    const isSealed =
      declaredKind === ProductKind.SEALED ||
      (!!sealedProductId && !getVal("cardid"));

    if (isSealed) {
      const sealedProduct = sealedProductId
        ? await manager.findOne(SealedProduct, {
            where: { id: sealedProductId },
          })
        : null;
      if (!sealedProduct) {
        throw new Error(
          `Produit scellé introuvable (sealedProductId: "${sealedProductId}")`,
        );
      }
      const condition = getVal("sealedcondition");
      return {
        productKind: ProductKind.SEALED,
        card: null,
        sealedProduct,
        variant: getVal("variant") || "normal",
        language: getVal("language") || "fr",
        printing: getVal("printing") || null,
        cardState: null,
        sealedCondition: (condition as SealedCondition) || null,
      };
    }

    const cardId = getVal("cardid");
    const tcgDexId = getVal("tcgdexid");
    let card: Card | null = null;
    if (cardId) card = await manager.findOne(Card, { where: { id: cardId } });
    if (!card && tcgDexId) {
      card = await manager.findOne(Card, { where: { tcgDexId } });
    }
    if (!card) {
      throw new Error(
        `Carte introuvable (cardId: "${cardId}", tcgDexId: "${tcgDexId}")`,
      );
    }

    const stateCode = getVal("cardstate") || CardStateCode.NM;
    const cardState =
      (await manager.findOne(CardState, {
        where: { code: stateCode as CardStateCode },
      })) ||
      defaultCardState ||
      null;

    return {
      productKind: ProductKind.CARD,
      card,
      sealedProduct: null,
      variant: getVal("variant") || "normal",
      language: getVal("language") || "fr",
      printing: getVal("printing") || null,
      cardState,
      sealedCondition: null,
    };
  }

  /** Reads an exported JSON array cell, tolerating an empty or malformed value. */
  private parseJsonArray(value: string): string[] | null {
    if (!value) return null;
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch {
      return null;
    }
  }

  /**
   * Safely moves items between collections owned by the user without duplicating inventory (COL-04).
   */
  async bulkMove(
    user: User,
    dto: BulkMoveDto,
  ): Promise<{ movedCount: number; operationId: string }> {
    const targetCollection = await this.collectionRepo.findOne({
      where: { id: dto.targetCollectionId },
      relations: ["user"],
    });

    if (!targetCollection) {
      throw new NotFoundException("Collection cible non trouvée");
    }

    this.assertOwner(targetCollection, user.id, user.role);

    const items = await this.itemRepo.find({
      where: { id: In(dto.itemIds) },
      relations: ["collection", "collection.user"],
    });

    const operationId = `move-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (items.length === 0) {
      return { movedCount: 0, operationId };
    }

    for (const item of items) {
      this.assertOwner(item.collection, user.id, user.role);
    }

    await this.dataSource.transaction(async (manager) => {
      const operation = await manager.save(
        CollectionBulkOperation,
        manager.create(CollectionBulkOperation, {
          collection: targetCollection,
          user,
          operationId,
          kind: BulkOperationKind.BULK_MOVE,
          status: BulkOperationStatus.APPLIED,
          summary: { movedCount: items.length },
        }),
      );

      for (const item of items) {
        const previousCollectionId = item.collection?.id ?? null;
        item.collection = targetCollection;
        await manager.save(CollectionItem, item);
        await manager.save(
          CollectionBulkOperationLine,
          manager.create(CollectionBulkOperationLine, {
            operation,
            collectionItem: item,
            created: false,
            previousCollectionId,
          }),
        );
      }
    });

    return { movedCount: items.length, operationId };
  }

  /**
   * Bulk deletes unreserved items from a collection (COL-04).
   */
  async bulkDelete(
    user: User,
    dto: BulkDeleteDto,
  ): Promise<{ deletedCount: number; operationId: string }> {
    const items = await this.itemRepo.find({
      where: { id: In(dto.itemIds) },
      relations: ["collection", "collection.user", "pokemonCard", "cardState"],
    });

    const operationId = `delete-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (items.length === 0) {
      return { deletedCount: 0, operationId };
    }

    for (const item of items) {
      this.assertOwner(item.collection, user.id, user.role);
      if (item.quantityReserved > 0) {
        throw new BadRequestException(
          `Impossible de supprimer l'item #${item.id} car il est actuellement réservé dans une annonce active`,
        );
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const operation = await manager.save(
        CollectionBulkOperation,
        manager.create(CollectionBulkOperation, {
          collection: items[0].collection,
          user,
          operationId,
          kind: BulkOperationKind.BULK_DELETE,
          status: BulkOperationStatus.APPLIED,
          summary: { deletedCount: items.length },
        }),
      );

      for (const item of items) {
        // A deleted row cannot come back under its own identifier, so undo
        // rebuilds it from this snapshot.
        await manager.save(
          CollectionBulkOperationLine,
          manager.create(CollectionBulkOperationLine, {
            operation,
            created: false,
            previousCollectionId: item.collection?.id ?? null,
            previousQuantity: item.quantity,
            previousAvailable: item.quantityAvailable,
            snapshot: {
              productKind: item.productKind,
              pokemonCardId: item.pokemonCard?.id ?? null,
              sealedProductId: item.sealedProduct?.id ?? null,
              cardStateId: item.cardState?.id ?? null,
              sealedCondition: item.sealedCondition ?? null,
              variant: item.variant ?? null,
              language: item.language ?? null,
              printing: item.printing ?? null,
              storageLocation: item.storageLocation ?? null,
              notes: item.notes ?? null,
              acquisitionCost: item.acquisitionCost ?? null,
              acquisitionCurrency: item.acquisitionCurrency ?? null,
              acquiredAt: item.acquiredAt ?? null,
              photoUrls: item.photoUrls ?? null,
              quantity: item.quantity,
              quantityAvailable: item.quantityAvailable,
              quantitySold: item.quantitySold,
              provenance: item.provenance ?? null,
            },
          }),
        );
        await manager.remove(CollectionItem, item);
      }
    });

    return { deletedCount: items.length, operationId };
  }

  /**
   * Reverses a recorded operation through compensating adjustments (COL-04).
   *
   * Only the copies the operation added are removed: an item that already
   * existed keeps the quantity it had, and one whose values changed since is
   * reported as a conflict instead of being overwritten.
   */
  async undoOperation(
    user: User,
    dto: UndoOperationDto,
  ): Promise<UndoResultDto> {
    const operation = await this.operationRepo.findOne({
      where: { operationId: dto.operationId },
      relations: ["collection", "collection.user"],
    });

    if (!operation) {
      throw new NotFoundException(
        `Aucune opération avec l'ID ${dto.operationId} trouvée`,
      );
    }
    this.assertOwner(operation.collection, user.id, user.role);

    if (operation.status === BulkOperationStatus.UNDONE) {
      return {
        operationId: dto.operationId,
        revertedCount: Number(operation.summary?.revertedCount ?? 0),
        removedCount: Number(operation.summary?.removedCount ?? 0),
        restoredCount: Number(operation.summary?.restoredCount ?? 0),
        conflicts: (operation.summary?.conflicts ?? []) as string[],
      };
    }

    let revertedCount = 0;
    let removedCount = 0;
    let restoredCount = 0;
    const conflicts: string[] = [];

    await this.dataSource.transaction(async (manager) => {
      const lines = await manager.find(CollectionBulkOperationLine, {
        where: { operation: { id: operation.id } },
        relations: ["collectionItem"],
      });

      for (const line of lines) {
        if (line.snapshot) {
          const snapshot = line.snapshot as Record<string, unknown>;
          const restored = await manager.save(
            CollectionItem,
            manager.create(CollectionItem, {
              collection: { id: line.previousCollectionId } as Collection,
              productKind: snapshot.productKind as ProductKind,
              pokemonCard: snapshot.pokemonCardId
                ? ({ id: snapshot.pokemonCardId } as Card)
                : null,
              sealedProduct: snapshot.sealedProductId
                ? ({ id: snapshot.sealedProductId } as SealedProduct)
                : null,
              cardState: snapshot.cardStateId
                ? ({ id: snapshot.cardStateId } as CardState)
                : null,
              sealedCondition: snapshot.sealedCondition as SealedCondition,
              variant: snapshot.variant as string,
              language: snapshot.language as string,
              printing: snapshot.printing as string,
              storageLocation: snapshot.storageLocation as string,
              notes: snapshot.notes as string,
              acquisitionCost: snapshot.acquisitionCost as number,
              acquisitionCurrency: snapshot.acquisitionCurrency as string,
              acquiredAt: snapshot.acquiredAt
                ? new Date(snapshot.acquiredAt as string)
                : null,
              photoUrls: snapshot.photoUrls as string[],
              quantity: Number(snapshot.quantity ?? 0),
              quantityAvailable: Number(snapshot.quantityAvailable ?? 0),
              quantityReserved: 0,
              quantitySold: Number(snapshot.quantitySold ?? 0),
              provenance: snapshot.provenance as Record<string, unknown>,
            }),
          );
          // The rebuilt item takes the place of the deleted one on its line.
          line.collectionItem = restored;
          await manager.save(CollectionBulkOperationLine, line);
          restoredCount++;
          revertedCount++;
          continue;
        }

        if (!line.collectionItem) continue;
        const item = await manager.findOne(CollectionItem, {
          where: { id: line.collectionItem.id },
          lock: { mode: "pessimistic_write" },
          loadEagerRelations: false,
        });
        if (!item) {
          conflicts.push(
            `L'item #${line.collectionItem.id} n'existe plus et n'a pas été rétabli`,
          );
          continue;
        }

        if (line.previousCollectionId && !line.quantityDelta) {
          item.collection = { id: line.previousCollectionId } as Collection;
          await manager.save(CollectionItem, item);
          revertedCount++;
          continue;
        }

        const committed =
          (item.quantityReserved ?? 0) + (item.quantitySold ?? 0);
        if (committed > 0 && line.created) {
          conflicts.push(
            `L'item #${item.id} est réservé ou vendu : ses copies importées ont été conservées`,
          );
          continue;
        }

        const expected = (line.previousQuantity ?? 0) + line.quantityDelta;
        if (item.quantity !== expected) {
          conflicts.push(
            `L'item #${item.id} a changé depuis l'opération (quantité ${item.quantity} au lieu de ${expected})`,
          );
        }

        const nextQuantity = item.quantity - line.quantityDelta;
        const nextAvailable = item.quantityAvailable - line.availableDelta;
        if (line.created && nextQuantity <= 0) {
          await manager.remove(CollectionItem, item);
          removedCount++;
          revertedCount++;
          continue;
        }

        item.quantity = Math.max(committed, nextQuantity);
        item.quantityAvailable = Math.max(
          0,
          Math.min(nextAvailable, item.quantity - committed),
        );
        await manager.save(CollectionItem, item);
        revertedCount++;
      }

      operation.status = BulkOperationStatus.UNDONE;
      operation.undoneAt = new Date();
      operation.summary = {
        ...(operation.summary ?? {}),
        revertedCount,
        removedCount,
        restoredCount,
        conflicts,
      };
      await manager.save(CollectionBulkOperation, operation);
    });

    return {
      operationId: dto.operationId,
      revertedCount,
      removedCount,
      restoredCount,
      conflicts,
    };
  }

  /**
   * Parses a complete CSV document, keeping quoted commas and newlines intact.
   */
  private parseCsvRows(content: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let insideQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (char === '"') {
        if (insideQuotes && content[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
        continue;
      }
      if (char === "," && !insideQuotes) {
        row.push(cell);
        cell = "";
        continue;
      }
      if ((char === "\n" || char === "\r") && !insideQuotes) {
        if (char === "\r" && content[i + 1] === "\n") i++;
        row.push(cell);
        cell = "";
        if (row.some((value) => value.trim().length > 0)) rows.push(row);
        row = [];
        continue;
      }
      cell += char;
    }

    row.push(cell);
    if (row.some((value) => value.trim().length > 0)) rows.push(row);
    return rows;
  }
}
