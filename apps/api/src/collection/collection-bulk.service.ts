import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { CardState, CardStateCode } from "src/card-state/entities/card-state.entity";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { ProductKind } from "src/common/enums/product-kind";
import { SealedCondition } from "src/common/enums/sealed-condition";
import { UserRole } from "src/common/enums/user";
import { User } from "src/user/entities/user.entity";
import { DataSource, In, Repository } from "typeorm";
import {
  BulkDeleteDto,
  BulkMoveDto,
  ImportCsvDto,
  ImportMode,
  ImportResultDto,
  UndoOperationDto,
} from "./dto/collection-bulk.dto";
import { Collection } from "./entities/collection.entity";

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
    private readonly dataSource: DataSource,
  ) {}

  private assertOwner(collection: Collection, userId: number, role?: UserRole): void {
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
   * Generates a formula-safe CSV string of collection inventory (COL-04).
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
      throw new NotFoundException(`Collection with id ${collectionId} not found`);
    }

    if (!collection.isPublic && collection.user?.id !== viewer?.id && viewer?.role !== UserRole.ADMIN) {
      throw new NotFoundException(`Collection with id ${collectionId} not found`);
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

    const headers = [
      "id",
      "productKind",
      "cardId",
      "tcgDexId",
      "cardName",
      "setName",
      "localId",
      "variant",
      "language",
      "cardState",
      "sealedCondition",
      "quantity",
      "quantityAvailable",
      "quantityReserved",
      "acquisitionCost",
      "acquisitionCurrency",
      "acquiredAt",
      "storageLocation",
      "notes",
    ];

    const rows: string[] = [headers.join(",")];

    for (const item of items) {
      const cardName =
        item.pokemonCard?.translations?.[0]?.name ||
        item.pokemonCard?.name ||
        (item.sealedProduct as any)?.name ||
        item.sealedProduct?.id ||
        "";

      const setName =
        item.pokemonCard?.set?.id || item.sealedProduct?.pokemonSet?.id || "";

      const row = [
        this.escapeCsvCell(item.id),
        this.escapeCsvCell(item.productKind),
        this.escapeCsvCell(item.pokemonCard?.id || ""),
        this.escapeCsvCell(item.pokemonCard?.tcgDexId || ""),
        this.escapeCsvCell(cardName),
        this.escapeCsvCell(setName),
        this.escapeCsvCell(item.pokemonCard?.localId || ""),
        this.escapeCsvCell(item.variant || "normal"),
        this.escapeCsvCell(item.language || "fr"),
        this.escapeCsvCell(item.cardState?.code || ""),
        this.escapeCsvCell(item.sealedCondition || ""),
        this.escapeCsvCell(item.quantity),
        this.escapeCsvCell(item.quantityAvailable),
        this.escapeCsvCell(item.quantityReserved),
        this.escapeCsvCell(item.acquisitionCost ?? ""),
        this.escapeCsvCell(item.acquisitionCurrency ?? ""),
        this.escapeCsvCell(item.acquiredAt ? item.acquiredAt.toISOString() : ""),
        this.escapeCsvCell(item.storageLocation ?? ""),
        this.escapeCsvCell(item.notes ?? ""),
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  /**
   * Imports inventory rows from a CSV string with provenance and idempotency (COL-04).
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
      throw new NotFoundException(`Collection with id ${collectionId} not found`);
    }

    this.assertOwner(collection, user.id, user.role);

    const operationId =
      dto.operationId || `import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const mode = dto.mode || ImportMode.ADD;

    // Check for idempotent re-execution
    const existingWithOp = await this.itemRepo.find({
      where: {
        collection: { id: collectionId },
      },
    });

    const alreadyImported = existingWithOp.filter(
      (item) => item.provenance?.operationId === operationId,
    );

    if (alreadyImported.length > 0 && dto.operationId) {
      return {
        operationId,
        importedCount: alreadyImported.length,
        updatedCount: 0,
        skippedCount: 0,
        errors: [],
      };
    }

    const defaultCardState =
      (await this.cardStateRepo.findOne({ where: { code: CardStateCode.NM } })) ||
      (await this.cardStateRepo.find())[0];

    const lines = dto.csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      throw new BadRequestException("Le fichier CSV est vide ou ne contient pas de données");
    }

    const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const headerMap = new Map<string, number>();
    rawHeaders.forEach((h, idx) => headerMap.set(h.toLowerCase(), idx));

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    await this.dataSource.transaction(async (manager) => {
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse simple CSV line (accounting for quotes)
        const cells = this.parseCsvLine(line);

        const getVal = (colName: string): string => {
          const idx = headerMap.get(colName.toLowerCase());
          if (idx === undefined || idx >= cells.length) return "";
          let val = cells[idx].trim();
          if (val.startsWith("'")) val = val.substring(1);
          return val;
        };

        const cardId = getVal("cardid");
        const tcgDexId = getVal("tcgdexid");
        const variant = getVal("variant") || "normal";
        const language = getVal("language") || "fr";
        const printing = getVal("printing") || null;
        const stateCode = getVal("cardstate") || "NM";
        const rawQty = parseInt(getVal("quantity"), 10);
        const quantity = isNaN(rawQty) || rawQty < 1 ? 1 : rawQty;
        const storageLocation = getVal("storagelocation") || null;
        const notes = getVal("notes") || null;

        // Find card entity
        let card: Card | null = null;
        if (cardId) {
          card = await manager.findOne(Card, { where: { id: cardId } });
        }
        if (!card && tcgDexId) {
          card = await manager.findOne(Card, { where: { tcgDexId } });
        }

        if (!card) {
          errors.push({
            row: i + 1,
            reason: `Carte introuvable (cardId: "${cardId}", tcgDexId: "${tcgDexId}")`,
          });
          skippedCount++;
          continue;
        }

        // Check if matching item exists in collection
        const existing = await manager.findOne(CollectionItem, {
          where: {
            collection: { id: collectionId },
            pokemonCard: { id: card.id },
            variant,
          },
        });

        if (existing) {
          if (mode === ImportMode.REPLACE) {
            existing.quantity = quantity;
            existing.quantityAvailable = quantity;
          } else {
            existing.quantity += quantity;
            existing.quantityAvailable += quantity;
          }
          existing.provenance = {
            operationId,
            mode,
            source: "csv_import",
            importedAt: new Date().toISOString(),
          };
          await manager.save(CollectionItem, existing);
          updatedCount++;
        } else {
          const cardState =
            (await manager.findOne(CardState, { where: { code: stateCode as CardStateCode } })) ||
            defaultCardState;

          const newItem = manager.create(CollectionItem, {
            collection,
            productKind: ProductKind.CARD,
            pokemonCard: card,
            cardState,
            variant,
            language,
            printing,
            storageLocation,
            notes,
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
          });
          await manager.save(CollectionItem, newItem);
          importedCount++;
        }
      }
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
   * Safely moves items between collections owned by the user without duplicating inventory (COL-04).
   */
  async bulkMove(user: User, dto: BulkMoveDto): Promise<{ movedCount: number }> {
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

    if (items.length === 0) {
      return { movedCount: 0 };
    }

    for (const item of items) {
      this.assertOwner(item.collection, user.id, user.role);
      item.collection = targetCollection;
    }

    await this.itemRepo.save(items);
    return { movedCount: items.length };
  }

  /**
   * Bulk deletes unreserved items from a collection (COL-04).
   */
  async bulkDelete(user: User, dto: BulkDeleteDto): Promise<{ deletedCount: number }> {
    const items = await this.itemRepo.find({
      where: { id: In(dto.itemIds) },
      relations: ["collection", "collection.user"],
    });

    if (items.length === 0) {
      return { deletedCount: 0 };
    }

    for (const item of items) {
      this.assertOwner(item.collection, user.id, user.role);
      if (item.quantityReserved > 0) {
        throw new BadRequestException(
          `Impossible de supprimer l'item #${item.id} car il est actuellement réservé dans une annonce active`,
        );
      }
    }

    await this.itemRepo.remove(items);
    return { deletedCount: items.length };
  }

  /**
   * Undoes an import operation through compensating inventory adjustments (COL-04).
   */
  async undoOperation(
    user: User,
    dto: UndoOperationDto,
  ): Promise<{ revertedCount: number }> {
    const items = await this.itemRepo.find({
      relations: ["collection", "collection.user"],
    });

    const affected = items.filter(
      (item) => item.provenance?.operationId === dto.operationId,
    );

    if (affected.length === 0) {
      throw new NotFoundException(`Aucune opération avec l'ID ${dto.operationId} trouvée`);
    }

    for (const item of affected) {
      this.assertOwner(item.collection, user.id, user.role);
      if (item.quantityReserved > 0 || item.quantitySold > 0) {
        throw new BadRequestException(
          `Impossible d'annuler l'opération #${dto.operationId} : des items ont déjà été réservés ou vendus`,
        );
      }
    }

    await this.itemRepo.remove(affected);
    return { revertedCount: affected.length };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let cur = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        result.push(cur);
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur);
    return result;
  }
}
