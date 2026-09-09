import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { DataSource } from "typeorm";
import { InventoryMovementKind } from "../common/enums/inventory-movement";
import { ListingStatus } from "../common/enums/listing-status";
import { InventoryMovement } from "./entities/inventory-movement.entity";
import { Listing } from "./entities/listing.entity";
import { OrderItem } from "./entities/order-item.entity";
import { ReturnItem } from "./entities/return-item.entity";
import { InventoryLedgerService } from "./inventory-ledger.service";

/** Row shape used by the in-memory manager below. */
type Row = Record<string, unknown> & { id?: number | string };

/**
 * Minimal in-memory EntityManager: these tests assert which copies move and how
 * often, while the PostgreSQL suite covers locking and real concurrency.
 */
class FakeManager {
  private readonly stores = new Map<unknown, Row[]>();
  private sequence = 1;

  store<T>(target: unknown): T[] {
    if (!this.stores.has(target)) this.stores.set(target, []);
    return this.stores.get(target)! as T[];
  }

  private matches(row: Row, where: Record<string, unknown>): boolean {
    return Object.entries(where).every(([key, value]) => {
      const current = row[key];
      if (value && typeof value === "object") {
        const expected = (value as Row).id ?? value;
        return !!current && String((current as Row).id) === String(expected);
      }
      return String(current ?? "") === String(value);
    });
  }

  create<T>(_target: unknown, data: T): T {
    return { ...data };
  }

  async save<T>(target: unknown, entity: T): Promise<T> {
    const rows = this.store<Row>(target);
    const row = entity as Row;
    if (row.id === undefined) row.id = this.sequence++;
    const index = rows.findIndex(
      (stored) => String(stored.id) === String(row.id),
    );
    if (index >= 0) rows[index] = row;
    else rows.push(row);
    return entity;
  }

  async find<T>(
    target: unknown,
    options: { where?: Record<string, unknown> } = {},
  ): Promise<T[]> {
    return this.store<Row>(target).filter((row) =>
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

  async count(
    target: unknown,
    options: { where?: Record<string, unknown> } = {},
  ): Promise<number> {
    return (await this.find(target, options)).length;
  }

  async update(
    target: unknown,
    criteria: Record<string, unknown>,
    patch: Record<string, unknown>,
  ): Promise<void> {
    for (const row of await this.find<Row>(target, { where: criteria })) {
      Object.assign(row, patch);
    }
  }

  async increment(
    target: unknown,
    criteria: Record<string, unknown>,
    column: string,
    value: number,
  ): Promise<void> {
    for (const row of await this.find<Row>(target, { where: criteria })) {
      row[column] = Number(row[column] ?? 0) + value;
    }
  }
}

describe("InventoryLedgerService", () => {
  let service: InventoryLedgerService;
  let manager: FakeManager;

  const item = (): CollectionItem =>
    manager.store<CollectionItem>(CollectionItem)[0];
  const listings = () => manager.store<Listing>(Listing);
  const movements = () => manager.store<InventoryMovement>(InventoryMovement);

  const seedItem = async (available = 5, reserved = 0, sold = 0) =>
    manager.save(CollectionItem, {
      id: 88,
      quantityAvailable: available,
      quantityReserved: reserved,
      quantitySold: sold,
    } as unknown as CollectionItem);

  const seedListing = async (
    overrides: Partial<Listing> = {},
  ): Promise<Listing> =>
    manager.save(Listing, {
      id: 10,
      isInventoryBacked: true,
      inventoryItem: { id: 88 },
      quantityAvailable: 2,
      inventoryReservedQuantity: 2,
      status: ListingStatus.ACTIVE,
      ...overrides,
    } as unknown as Listing);

  const offer = (quantityAvailable: number, status: ListingStatus) => ({
    quantityAvailable,
    status,
  });

  beforeEach(async () => {
    manager = new FakeManager();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryLedgerService,
        {
          provide: DataSource,
          useValue: {
            transaction: (work: (m: FakeManager) => Promise<unknown>) =>
              work(manager),
          },
        },
        {
          provide: getRepositoryToken(InventoryMovement),
          useValue: { find: jest.fn(), manager: { findOne: jest.fn() } },
        },
      ],
    }).compile();

    service = module.get(InventoryLedgerService);
    await seedItem();
  });

  describe("applyMovement", () => {
    it("refuses a movement that would create or destroy copies", async () => {
      await expect(
        service.applyMovement(manager as never, 88, {
          kind: InventoryMovementKind.LISTING_RESERVE,
          requestKey: "invalid",
          reserved: 2,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(movements()).toHaveLength(0);
    });

    it("refuses a movement that would leave a negative quantity", async () => {
      await expect(
        service.applyMovement(manager as never, 88, {
          kind: InventoryMovementKind.SALE_COMMIT,
          requestKey: "oversold",
          reserved: -1,
          sold: 1,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(item().quantityAvailable).toBe(5);
    });

    it("records one movement per key, whatever the number of replays", async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        await service.applyMovement(manager as never, 88, {
          kind: InventoryMovementKind.LISTING_RESERVE,
          requestKey: "listing:10:created",
          available: -2,
          reserved: 2,
        });
      }

      // One reservation movement, preceded by the item's adoption entry.
      expect(movements()).toHaveLength(2);
      expect(movements()[0].kind).toBe(InventoryMovementKind.OPENING_BALANCE);
      expect(item().quantityAvailable).toBe(3);
      expect(item().quantityReserved).toBe(2);
    });
  });

  describe("syncListingReservation", () => {
    it("reserves the offered copies when a listing is created", async () => {
      const listing = await seedListing({
        quantityAvailable: 2,
        inventoryReservedQuantity: 0,
      });

      await service.syncListingReservation(
        manager as never,
        listing,
        offer(0, ListingStatus.INACTIVE),
        offer(2, ListingStatus.ACTIVE),
        "created",
      );

      expect(item().quantityAvailable).toBe(3);
      expect(item().quantityReserved).toBe(2);
      expect(listings()[0].inventoryReservedQuantity).toBe(2);
    });

    it("releases a deactivated offer once and reacquires it on reactivation", async () => {
      const listing = await seedListing();
      await service.applyMovement(manager as never, 88, {
        kind: InventoryMovementKind.LISTING_RESERVE,
        requestKey: "seed",
        available: -2,
        reserved: 2,
      });

      await service.syncListingReservation(
        manager as never,
        listing,
        offer(2, ListingStatus.ACTIVE),
        offer(2, ListingStatus.INACTIVE),
        "deactivated",
      );
      expect(item().quantityReserved).toBe(0);
      expect(item().quantityAvailable).toBe(5);

      // The audited defect: deleting an already inactive listing released the
      // same copies a second time.
      await service.syncListingReservation(
        manager as never,
        listing,
        offer(2, ListingStatus.INACTIVE),
        { quantityAvailable: 2, status: ListingStatus.INACTIVE, deleted: true },
        "deleted",
      );
      expect(item().quantityAvailable).toBe(5);
      expect(item().quantityReserved).toBe(0);

      await service.syncListingReservation(
        manager as never,
        listing,
        offer(2, ListingStatus.INACTIVE),
        offer(2, ListingStatus.ACTIVE),
        "reactivated",
      );
      expect(item().quantityReserved).toBe(2);
      expect(listings()[0].inventoryReservedQuantity).toBe(2);
    });

    it("moves only the difference when the offered quantity changes", async () => {
      const listing = await seedListing();
      await service.applyMovement(manager as never, 88, {
        kind: InventoryMovementKind.LISTING_RESERVE,
        requestKey: "seed",
        available: -2,
        reserved: 2,
      });

      await service.syncListingReservation(
        manager as never,
        listing,
        offer(2, ListingStatus.ACTIVE),
        offer(4, ListingStatus.ACTIVE),
        "quantity",
      );

      expect(item().quantityAvailable).toBe(1);
      expect(item().quantityReserved).toBe(4);
      expect(listings()[0].inventoryReservedQuantity).toBe(4);
    });

    it("refuses an offer the collection cannot back", async () => {
      const listing = await seedListing();

      await expect(
        service.syncListingReservation(
          manager as never,
          listing,
          offer(0, ListingStatus.INACTIVE),
          offer(9, ListingStatus.ACTIVE),
          "created",
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("leaves quantities alone for a listing without physical backing", async () => {
      const listing = await seedListing({
        isInventoryBacked: false,
        inventoryItem: null,
      });

      await service.syncListingReservation(
        manager as never,
        listing,
        offer(2, ListingStatus.ACTIVE),
        offer(0, ListingStatus.INACTIVE),
        "deactivated",
      );

      expect(movements()).toHaveLength(0);
      expect(item().quantityAvailable).toBe(5);
    });
  });

  describe("commitSale", () => {
    it("transfers reserved copies to sold once per order line", async () => {
      const listing = await seedListing();
      await service.applyMovement(manager as never, 88, {
        kind: InventoryMovementKind.LISTING_RESERVE,
        requestKey: "seed",
        available: -2,
        reserved: 2,
      });
      const orderItem = { id: 500 } as OrderItem;

      await service.commitSale(manager as never, listing, orderItem, 1);
      await service.commitSale(manager as never, listing, orderItem, 1);

      expect(item().quantityReserved).toBe(1);
      expect(item().quantitySold).toBe(1);
      expect(listings()[0].inventoryReservedQuantity).toBe(1);
    });
  });

  describe("returns", () => {
    const returnItem = { id: "ret-1" } as ReturnItem;

    it("restocks a still-offered listing back into its own reservation", async () => {
      const listing = await seedListing();
      await service.applyMovement(manager as never, 88, {
        kind: InventoryMovementKind.SALE_COMMIT,
        requestKey: "seed-sale",
        available: -1,
        sold: 1,
      });

      await service.restockReturn(manager as never, returnItem, listing, 1, 1);
      await service.restockReturn(manager as never, returnItem, listing, 1, 1);

      expect(item().quantitySold).toBe(0);
      expect(item().quantityReserved).toBe(1);
      expect(listings()[0].quantityAvailable).toBe(3);
      expect(listings()[0].inventoryReservedQuantity).toBe(3);
    });

    it("returns copies to the collection when the listing no longer offers them", async () => {
      const listing = await seedListing({ status: ListingStatus.INACTIVE });
      await service.applyMovement(manager as never, 88, {
        kind: InventoryMovementKind.SALE_COMMIT,
        requestKey: "seed-sale",
        available: -1,
        sold: 1,
      });

      await service.restockReturn(manager as never, returnItem, listing, 1, 1);

      expect(item().quantitySold).toBe(0);
      expect(item().quantityAvailable).toBe(5);
      expect(listings()[0].quantityAvailable).toBe(2);
    });

    it("reverses a restock without offering the copies twice", async () => {
      const listing = await seedListing();
      await service.applyMovement(manager as never, 88, {
        kind: InventoryMovementKind.SALE_COMMIT,
        requestKey: "seed-sale",
        available: -1,
        sold: 1,
      });
      await service.restockReturn(manager as never, returnItem, listing, 1, 1);

      await service.reverseRestock(
        manager as never,
        returnItem,
        listings()[0],
        1,
        2,
      );

      expect(item().quantitySold).toBe(1);
      expect(item().quantityReserved).toBe(0);
      expect(listings()[0].quantityAvailable).toBe(2);
      expect(listings()[0].inventoryReservedQuantity).toBe(2);
    });
  });
});
