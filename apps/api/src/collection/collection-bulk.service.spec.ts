import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import {
  CardState,
  CardStateCode,
} from "src/card-state/entities/card-state.entity";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { ProductKind } from "src/common/enums/product-kind";
import { UserRole } from "src/common/enums/user";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import { User } from "src/user/entities/user.entity";
import { DataSource } from "typeorm";
import { CollectionBulkService } from "./collection-bulk.service";
import { ImportMode } from "./dto/collection-bulk.dto";
import {
  BulkOperationStatus,
  CollectionBulkOperation,
  CollectionBulkOperationLine,
} from "./entities/collection-bulk-operation.entity";
import { Collection } from "./entities/collection.entity";

/** Row shape used by the in-memory store below. */
type Row = Record<string, unknown> & { id?: number | string };

/**
 * In-memory manager and repositories sharing one store, so a write inside the
 * service's transaction is visible to the reads that follow it.
 */
class FakeStore {
  private readonly tables = new Map<unknown, Row[]>();
  private sequence = 1;

  rows<T>(target: unknown): T[] {
    if (!this.tables.has(target)) this.tables.set(target, []);
    return this.tables.get(target)! as T[];
  }

  private matches(row: Row, where: Record<string, unknown>): boolean {
    return Object.entries(where).every(([key, value]) => {
      const current = row[key];
      if (value && typeof value === "object") {
        const criteria = value as Row & { _type?: string };
        // Mirrors IsNull(): the property must be absent on the row.
        if (criteria._type === "isNull") return current == null;
        if ("id" in criteria) {
          return !!current && String((current as Row).id) === String(criteria.id);
        }
        return true;
      }
      return String(current ?? "") === String(value);
    });
  }

  create<T>(_target: unknown, data: T): T {
    return { ...data };
  }

  async save<T>(target: unknown, entity: T): Promise<T> {
    const rows = this.rows<Row>(target);
    const row = entity as Row;
    if (row.id === undefined) row.id = this.sequence++;
    const index = rows.findIndex(
      (stored) => String(stored.id) === String(row.id),
    );
    if (index >= 0) rows[index] = row;
    else rows.push(row);
    return entity;
  }

  async remove<T>(target: unknown, entity: T): Promise<T> {
    const rows = this.rows<Row>(target);
    const index = rows.findIndex(
      (stored) => String(stored.id) === String((entity as Row).id),
    );
    if (index >= 0) rows.splice(index, 1);
    return entity;
  }

  async find<T>(
    target: unknown,
    options: { where?: Record<string, unknown> } = {},
  ): Promise<T[]> {
    return this.rows<Row>(target).filter((row) =>
      this.matches(row, options.where ?? {}),
    ) as T[];
  }

  async findOne<T>(
    target: unknown,
    options: { where?: Record<string, unknown> } = {},
  ): Promise<T | null> {
    const [row] = await this.find<T>(target, options);
    return row ?? null;
  }

  repository(target: unknown) {
    return {
      find: (options = {}) => this.find(target, options),
      findOne: (options = {}) => this.findOne(target, options),
      create: (data: Row) => this.create(target, data),
      save: (entity: Row) => this.save(target, entity),
      remove: (entity: Row) => this.remove(target, entity),
    };
  }
}

describe("CollectionBulkService", () => {
  let service: CollectionBulkService;
  let store: FakeStore;

  const owner = { id: 1, role: UserRole.USER } as User;
  const stranger = { id: 2, role: UserRole.USER } as User;
  const admin = { id: 3, role: UserRole.ADMIN } as User;

  const collectionId = "col-1";
  const items = () => store.rows<CollectionItem>(CollectionItem);
  const operations = () =>
    store.rows<CollectionBulkOperation>(CollectionBulkOperation);
  const lines = () =>
    store.rows<CollectionBulkOperationLine>(CollectionBulkOperationLine);

  const seedCollection = async (overrides: Partial<Collection> = {}) =>
    store.save(Collection, {
      id: collectionId,
      name: "Main",
      isPublic: false,
      user: owner,
      ...overrides,
    } as unknown as Collection);

  const seedItem = async (overrides: Partial<CollectionItem> = {}) =>
    store.save(CollectionItem, {
      id: 500,
      // The stored collection row carries its owner, as the relation would.
      collection: store.rows<Collection>(Collection)[0] ?? {
        id: collectionId,
        user: owner,
      },
      productKind: ProductKind.CARD,
      pokemonCard: { id: "card-1" },
      cardState: { id: 1, code: CardStateCode.NM },
      variant: "normal",
      language: "fr",
      printing: null,
      quantity: 1,
      quantityAvailable: 1,
      quantityReserved: 0,
      quantitySold: 0,
      ...overrides,
    } as unknown as CollectionItem);

  const csv = (rows: string[]) =>
    [
      "cardId,variant,language,cardState,quantity,notes",
      ...rows,
    ].join("\n");

  beforeEach(async () => {
    store = new FakeStore();
    await store.save(Card, { id: "card-1", tcgDexId: "tcg-1" } as unknown as Card);
    await store.save(CardState, {
      id: 1,
      code: CardStateCode.NM,
    } as unknown as CardState);
    await store.save(CardState, {
      id: 2,
      code: CardStateCode.LP,
    } as unknown as CardState);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionBulkService,
        {
          provide: getRepositoryToken(Collection),
          useValue: store.repository(Collection),
        },
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: store.repository(CollectionItem),
        },
        { provide: getRepositoryToken(Card), useValue: store.repository(Card) },
        {
          provide: getRepositoryToken(CardState),
          useValue: store.repository(CardState),
        },
        {
          provide: getRepositoryToken(CollectionBulkOperation),
          useValue: store.repository(CollectionBulkOperation),
        },
        {
          provide: DataSource,
          useValue: {
            transaction: (work: (manager: FakeStore) => Promise<unknown>) =>
              work(store),
          },
        },
      ],
    }).compile();

    service = module.get(CollectionBulkService);
  });

  describe("exportCsv", () => {
    it("throws NotFoundException if collection does not exist", async () => {
      await expect(service.exportCsv("missing", owner)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("hides a private collection from another user", async () => {
      await seedCollection();

      await expect(service.exportCsv(collectionId, stranger)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("allows an administrator to export a private collection", async () => {
      await seedCollection();

      await expect(
        service.exportCsv(collectionId, admin),
      ).resolves.toContain("schemaVersion");
    });

    it("escapes formula injection and keeps quoted values intact", async () => {
      await seedCollection();
      await seedItem({
        notes: '=SUM(A1:A2)',
        storageLocation: 'Binder "A", shelf\n2',
      } as Partial<CollectionItem>);

      const output = await service.exportCsv(collectionId, owner);

      expect(output).toContain("'=SUM(A1:A2)");
      expect(output).toContain('"Binder ""A"", shelf\n2"');
    });

    it("exports the columns a physical copy needs to round trip", async () => {
      await seedCollection();
      await seedItem({
        printing: "1st_edition",
        acquisitionCost: 12.5,
        acquisitionCurrency: "EUR",
        photoUrls: ["https://example.test/a.png"],
      } as Partial<CollectionItem>);

      const [header, row] = (await service.exportCsv(collectionId, owner)).split(
        "\n",
      );

      expect(header).toContain("printing");
      expect(header).toContain("photoUrls");
      expect(header).toContain("quantitySold");
      expect(row).toContain("1st_edition");
      expect(row).toContain("12.5");
    });
  });

  describe("importCsv", () => {
    beforeEach(async () => {
      await seedCollection();
    });

    it("throws NotFoundException if collection does not exist", async () => {
      await expect(
        service.importCsv("missing", owner, { csvContent: csv([]) }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException when the collection belongs to someone else", async () => {
      await expect(
        service.importCsv(collectionId, stranger, { csvContent: csv([]) }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws BadRequestException when the file has no data rows", async () => {
      await expect(
        service.importCsv(collectionId, owner, { csvContent: csv([]) }),
      ).rejects.toThrow(BadRequestException);
    });

    it("creates items and reports rows whose product is unknown", async () => {
      const result = await service.importCsv(collectionId, owner, {
        csvContent: csv([
          "card-1,normal,fr,NM,2,",
          "unknown-card,normal,fr,NM,1,",
        ]),
      });

      expect(result.importedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(result.errors[0].row).toBe(3);
      expect(items()[0].quantity).toBe(2);
      expect(items()[0].provenance?.operationId).toBe(result.operationId);
    });

    it("resolves a card by its tcgDex identifier", async () => {
      const result = await service.importCsv(collectionId, owner, {
        csvContent: [
          "tcgDexId,variant,language,cardState,quantity",
          "tcg-1,normal,fr,NM,1",
        ].join("\n"),
      });

      expect(result.importedCount).toBe(1);
    });

    it("adds to an existing stack of the same physical identity", async () => {
      await seedItem({ quantity: 1, quantityAvailable: 1 });

      const result = await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,NM,2,"]),
        mode: ImportMode.ADD,
      });

      expect(result.updatedCount).toBe(1);
      expect(items()).toHaveLength(1);
      expect(items()[0].quantity).toBe(3);
      expect(items()[0].quantityAvailable).toBe(3);
    });

    it("keeps a different condition as its own stack", async () => {
      await seedItem({ quantity: 1, quantityAvailable: 1 });

      const result = await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,LP,1,"]),
      });

      expect(result.importedCount).toBe(1);
      expect(items()).toHaveLength(2);
    });

    it("refuses to replace a quantity below the copies already committed", async () => {
      await seedItem({
        quantity: 5,
        quantityAvailable: 2,
        quantityReserved: 3,
      } as Partial<CollectionItem>);

      const result = await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,NM,1,"]),
        mode: ImportMode.REPLACE,
      });

      expect(result.skippedCount).toBe(1);
      expect(result.errors[0].reason).toContain("réservée");
      expect(items()[0].quantity).toBe(5);
    });

    it("replaces the quantity while preserving committed copies", async () => {
      await seedItem({
        quantity: 5,
        quantityAvailable: 2,
        quantityReserved: 3,
      } as Partial<CollectionItem>);

      await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,NM,4,"]),
        mode: ImportMode.REPLACE,
      });

      expect(items()[0].quantity).toBe(4);
      expect(items()[0].quantityAvailable).toBe(1);
    });

    it("answers a replayed operation from its recorded summary", async () => {
      const first = await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,NM,2,"]),
        operationId: "op-1",
      });
      const replay = await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,NM,2,"]),
        operationId: "op-1",
      });

      expect(replay).toEqual(first);
      expect(items()).toHaveLength(1);
      expect(items()[0].quantity).toBe(2);
    });

    it("keeps the provenance of the operation that created an item", async () => {
      const first = await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,NM,1,"]),
        operationId: "first-op",
      });
      await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,NM,1,"]),
        operationId: "second-op",
      });

      expect(items()[0].provenance?.operationId).toBe(first.operationId);
    });
  });

  describe("undoOperation", () => {
    beforeEach(async () => {
      await seedCollection();
    });

    it("throws NotFoundException for an unknown operation", async () => {
      await expect(
        service.undoOperation(owner, { operationId: "nope" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("restores the quantity an import added without deleting older stock", async () => {
      // The audited defect: undo removed the whole pre-existing item.
      await seedItem({ quantity: 1, quantityAvailable: 1 });
      await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,NM,2,"]),
        operationId: "op-add",
      });
      expect(items()[0].quantity).toBe(3);

      const result = await service.undoOperation(owner, {
        operationId: "op-add",
      });

      expect(result.revertedCount).toBe(1);
      expect(items()).toHaveLength(1);
      expect(items()[0].quantity).toBe(1);
      expect(items()[0].quantityAvailable).toBe(1);
    });

    it("removes the items the operation itself created", async () => {
      await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,NM,2,"]),
        operationId: "op-new",
      });

      const result = await service.undoOperation(owner, {
        operationId: "op-new",
      });

      expect(result.removedCount).toBe(1);
      expect(items()).toHaveLength(0);
    });

    it("keeps reserved copies and reports them as a conflict", async () => {
      await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,NM,2,"]),
        operationId: "op-reserved",
      });
      items()[0].quantityReserved = 1;

      const result = await service.undoOperation(owner, {
        operationId: "op-reserved",
      });

      expect(result.conflicts[0]).toContain("réservé");
      expect(items()).toHaveLength(1);
    });

    it("reports drift when the item changed after the operation", async () => {
      await seedItem({ quantity: 1, quantityAvailable: 1 });
      await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,NM,2,"]),
        operationId: "op-drift",
      });
      items()[0].quantity = 10;
      items()[0].quantityAvailable = 10;

      const result = await service.undoOperation(owner, {
        operationId: "op-drift",
      });

      expect(result.conflicts[0]).toContain("a changé depuis l'opération");
      expect(items()[0].quantity).toBe(8);
    });

    it("answers a repeated undo from its recorded outcome", async () => {
      await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,NM,2,"]),
        operationId: "op-twice",
      });

      const first = await service.undoOperation(owner, {
        operationId: "op-twice",
      });
      const second = await service.undoOperation(owner, {
        operationId: "op-twice",
      });

      expect(second).toEqual(first);
      expect(operations()[0].status).toBe(BulkOperationStatus.UNDONE);
    });

    it("refuses to undo another user's operation", async () => {
      await service.importCsv(collectionId, owner, {
        csvContent: csv(["card-1,normal,fr,NM,1,"]),
        operationId: "op-owned",
      });

      await expect(
        service.undoOperation(stranger, { operationId: "op-owned" }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("bulkMove", () => {
    it("throws NotFoundException if target collection does not exist", async () => {
      await expect(
        service.bulkMove(owner, { itemIds: [1], targetCollectionId: "missing" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException if the target belongs to another user", async () => {
      await seedCollection();

      await expect(
        service.bulkMove(stranger, {
          itemIds: [1],
          targetCollectionId: collectionId,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("moves items and records the operation that can restore them", async () => {
      await seedCollection();
      const target = await store.save(Collection, {
        id: "col-2",
        user: owner,
        isPublic: false,
      } as unknown as Collection);
      await seedItem();

      const result = await service.bulkMove(owner, {
        itemIds: [500],
        targetCollectionId: target.id,
      });

      expect(result.movedCount).toBe(1);
      expect(items()[0].collection.id).toBe("col-2");
      expect(lines()[0].previousCollectionId).toBe(collectionId);

      await service.undoOperation(owner, { operationId: result.operationId });
      expect(items()[0].collection.id).toBe(collectionId);
    });
  });

  describe("bulkDelete", () => {
    beforeEach(async () => {
      await seedCollection();
    });

    it("refuses to delete an item reserved by a listing", async () => {
      await seedItem({ quantityReserved: 1 } as Partial<CollectionItem>);

      await expect(
        service.bulkDelete(owner, { itemIds: [500] }),
      ).rejects.toThrow(BadRequestException);
      expect(items()).toHaveLength(1);
    });

    it("deletes items and can rebuild them from their snapshot", async () => {
      await seedItem({ quantity: 3, quantityAvailable: 3 });

      const result = await service.bulkDelete(owner, { itemIds: [500] });
      expect(result.deletedCount).toBe(1);
      expect(items()).toHaveLength(0);

      const undo = await service.undoOperation(owner, {
        operationId: result.operationId,
      });

      expect(undo.restoredCount).toBe(1);
      expect(items()).toHaveLength(1);
      expect(items()[0].quantity).toBe(3);
    });
  });

  it("keeps a sealed product identity through an import", async () => {
    await seedCollection();
    await store.save(SealedProduct, {
      id: "sealed-1",
    } as unknown as SealedProduct);

    const result = await service.importCsv(collectionId, owner, {
      csvContent: [
        "productKind,sealedProductId,sealedCondition,quantity",
        "sealed,sealed-1,sealed,2",
      ].join("\n"),
    });

    expect(result.importedCount).toBe(1);
    expect(items()[0].productKind).toBe(ProductKind.SEALED);
    expect(items()[0].sealedProduct?.id).toBe("sealed-1");
  });
});
