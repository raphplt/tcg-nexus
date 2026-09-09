import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { DataSource } from "typeorm";
import { Card } from "../src/card/entities/card.entity";
import { CollectionItem } from "../src/collection-item/entities/collection-item.entity";
import { Collection } from "../src/collection/entities/collection.entity";
import { Currency } from "../src/common/enums/currency";
import { InventoryDisposition } from "../src/common/enums/inventory-disposition";
import { ListingStatus } from "../src/common/enums/listing-status";
import { CardState } from "../src/common/enums/pokemonCardsType";
import { ProductKind } from "../src/common/enums/product-kind";
import { InventoryMovement } from "../src/marketplace/entities/inventory-movement.entity";
import { Listing } from "../src/marketplace/entities/listing.entity";
import { Order, OrderStatus } from "../src/marketplace/entities/order.entity";
import { OrderItem } from "../src/marketplace/entities/order-item.entity";
import { ReturnItem } from "../src/marketplace/entities/return-item.entity";
import { InventoryLedgerService } from "../src/marketplace/inventory-ledger.service";
import { InventoryMovementsAndListingReservations1788900000000 } from "../src/migrations/1788900000000-InventoryMovementsAndListingReservations";
import { RefundService } from "../src/marketplace/refund.service";
import { createE2eApp } from "./helpers/app";
import { createAdminUser, createUser, TestUser } from "./helpers/auth";
import { ensureCard } from "./helpers/marketplace";

jest.setTimeout(60000);

describe("Physical inventory conservation (PostgreSQL)", () => {
  let app: INestApplication;
  let server: Server;
  let database: DataSource;
  let ledger: InventoryLedgerService;
  let refunds: RefundService;
  let seller: TestUser;
  let buyer: TestUser;
  let admin: TestUser;
  let card: Card;
  let collectionId: string;
  let itemId: number;

  const auth = (user: TestUser) => ({
    Authorization: `Bearer ${user.accessToken}`,
  });

  const item = async (): Promise<CollectionItem> =>
    database.getRepository(CollectionItem).findOneByOrFail({ id: itemId });
  const listingOf = async (id: number): Promise<Listing> =>
    database
      .getRepository(Listing)
      .findOneOrFail({ where: { id }, withDeleted: true });

  /** Creates a physical copy stack owned by the seller. */
  const seedItem = async (quantity: number): Promise<number> => {
    const saved = await database.getRepository(CollectionItem).save({
      collection: { id: collectionId },
      productKind: ProductKind.CARD,
      pokemonCard: card,
      quantity,
      quantityAvailable: quantity,
      quantityReserved: 0,
      quantitySold: 0,
    } as unknown as CollectionItem);
    return saved.id;
  };

  const createListing = (quantityAvailable: number) =>
    request(server).post("/marketplace/listings").set(auth(seller)).send({
      inventoryItemId: itemId,
      pokemonCardId: card.id,
      productKind: ProductKind.CARD,
      cardState: CardState.NM,
      price: 25,
      currency: Currency.EUR,
      quantityAvailable,
    });

  const patchListing = (id: number, body: Record<string, unknown>) =>
    request(server)
      .patch(`/marketplace/listings/${id}`)
      .set(auth(seller))
      .send(body);

  /** Sells `quantity` copies of a listing through a paid order. */
  const sell = async (
    listingId: number,
    quantity: number,
  ): Promise<OrderItem> => {
    const order = await database.getRepository(Order).save({
      buyer: { id: buyer.id },
      totalAmount: 25 * quantity,
      shippingAmount: 0,
      currency: Currency.EUR,
      status: OrderStatus.PAID,
    } as unknown as Order);
    const orderItem = await database.getRepository(OrderItem).save({
      order,
      seller: { id: seller.id },
      listing: { id: listingId },
      quantity,
      unitPrice: 25,
      shippingCost: 0,
    } as unknown as OrderItem);

    const listing = await database.getRepository(Listing).findOneOrFail({
      where: { id: listingId },
      relations: ["inventoryItem"],
    });
    await database.transaction(async (manager) => {
      await manager.decrement(
        Listing,
        { id: listingId },
        "quantityAvailable",
        quantity,
      );
      await ledger.commitSale(manager, listing, orderItem, quantity);
    });
    return orderItem;
  };

  const setDisposition = (
    returnId: string,
    disposition: InventoryDisposition,
  ) =>
    request(server)
      .patch(`/marketplace/returns/${returnId}/disposition`)
      .set(auth(seller))
      .send({ disposition });

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    server = app.getHttpServer() as Server;
    database = app.get(DataSource);
    ledger = app.get(InventoryLedgerService);
    refunds = app.get(RefundService);
    seller = await createUser(server);
    buyer = await createUser(server);
    admin = await createAdminUser(server, app);
    card = await ensureCard(app);

    const collection = await database.getRepository(Collection).save({
      name: `Inventory E2E ${Date.now()}`,
      user: { id: seller.id },
      isPublic: false,
    } as unknown as Collection);
    collectionId = collection.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    itemId = await seedItem(5);
  });

  it("reserves an offer on creation and refuses one the collection cannot back", async () => {
    const listingId = (await createListing(2).expect(201)).body.id;

    const stock = await item();
    expect(stock.quantityAvailable).toBe(3);
    expect(stock.quantityReserved).toBe(2);
    expect((await listingOf(listingId)).inventoryReservedQuantity).toBe(2);

    await createListing(9).expect(400);
    expect((await item()).quantityReserved).toBe(2);
  });

  it("releases a deactivated offer once, including when it is then deleted", async () => {
    const listingId = (await createListing(2).expect(201)).body.id;

    await patchListing(listingId, { status: ListingStatus.INACTIVE }).expect(
      200,
    );
    let stock = await item();
    expect(stock.quantityAvailable).toBe(5);
    expect(stock.quantityReserved).toBe(0);

    // The audited defect: deleting an already inactive listing returned the
    // same copies a second time.
    await request(server)
      .delete(`/marketplace/listings/${listingId}`)
      .set(auth(seller))
      .expect(200);

    stock = await item();
    expect(stock.quantityAvailable).toBe(5);
    expect(stock.quantityReserved).toBe(0);
    expect((await listingOf(listingId)).inventoryReservedQuantity).toBe(0);
  });

  it("reacquires the reservation on reactivation and refuses it when the copies are gone", async () => {
    const listingId = (await createListing(2).expect(201)).body.id;
    await patchListing(listingId, { status: ListingStatus.INACTIVE }).expect(
      200,
    );

    await patchListing(listingId, { status: ListingStatus.ACTIVE }).expect(200);
    expect((await item()).quantityReserved).toBe(2);

    await patchListing(listingId, { status: ListingStatus.INACTIVE }).expect(
      200,
    );
    await database
      .getRepository(CollectionItem)
      .update({ id: itemId }, { quantityAvailable: 1 });

    await patchListing(listingId, { status: ListingStatus.ACTIVE }).expect(400);
    const stock = await item();
    expect(stock.quantityAvailable).toBe(1);
    expect(stock.quantityReserved).toBe(0);
  });

  it("moves only the difference when the offered quantity changes", async () => {
    const listingId = (await createListing(2).expect(201)).body.id;

    await patchListing(listingId, { quantityAvailable: 4 }).expect(200);
    expect((await item()).quantityReserved).toBe(4);

    await patchListing(listingId, { quantityAvailable: 1 }).expect(200);
    const stock = await item();
    expect(stock.quantityReserved).toBe(1);
    expect(stock.quantityAvailable).toBe(4);
    expect((await listingOf(listingId)).inventoryReservedQuantity).toBe(1);
  });

  it("commits a sale once and stops the listing from releasing sold copies", async () => {
    const listingId = (await createListing(2).expect(201)).body.id;
    const orderItem = await sell(listingId, 1);

    let stock = await item();
    expect(stock.quantityReserved).toBe(1);
    expect(stock.quantitySold).toBe(1);

    // A replayed payment confirmation must not sell the same copy twice.
    const listing = await database.getRepository(Listing).findOneOrFail({
      where: { id: listingId },
      relations: ["inventoryItem"],
    });
    await database.transaction((manager) =>
      ledger.commitSale(manager, listing, orderItem, 1),
    );
    stock = await item();
    expect(stock.quantitySold).toBe(1);

    await request(server)
      .delete(`/marketplace/listings/${listingId}`)
      .set(auth(seller))
      .expect(200);
    stock = await item();
    expect(stock.quantityAvailable).toBe(4);
    expect(stock.quantityReserved).toBe(0);
    expect(stock.quantitySold).toBe(1);
  });

  it("restocks a returned copy once however often the disposition is toggled", async () => {
    const listingId = (await createListing(2).expect(201)).body.id;
    const orderItem = await sell(listingId, 1);
    const returned = await refunds.createReturnRequest(
      orderItem.id,
      { quantity: 1, reason: "Damaged in transit" },
      { id: buyer.id, role: "user" } as never,
    );

    // The audited defect: restock -> damaged -> restock raised stock from 1 to 3.
    await setDisposition(returned.id, InventoryDisposition.RESTOCK).expect(200);
    await setDisposition(returned.id, InventoryDisposition.RESTOCK).expect(200);
    await setDisposition(returned.id, InventoryDisposition.DAMAGED).expect(200);
    await setDisposition(returned.id, InventoryDisposition.RESTOCK).expect(200);

    const listing = await listingOf(listingId);
    expect(listing.quantityAvailable).toBe(2);
    expect(listing.inventoryReservedQuantity).toBe(2);
    const stock = await item();
    expect(stock.quantityAvailable).toBe(3);
    expect(stock.quantityReserved).toBe(2);
    expect(stock.quantitySold).toBe(0);
    expect(
      (
        await database.getRepository(ReturnItem).findOneByOrFail({
          id: returned.id,
        })
      ).restockedQuantity,
    ).toBe(1);
  });

  it("serializes concurrent disposition changes on the same return", async () => {
    const listingId = (await createListing(2).expect(201)).body.id;
    const orderItem = await sell(listingId, 1);
    const returned = await refunds.createReturnRequest(
      orderItem.id,
      { quantity: 1, reason: "Wrong card" },
      { id: buyer.id, role: "user" } as never,
    );

    const responses = await Promise.all([
      setDisposition(returned.id, InventoryDisposition.RESTOCK),
      setDisposition(returned.id, InventoryDisposition.RESTOCK),
      setDisposition(returned.id, InventoryDisposition.RESTOCK),
    ]);

    expect(responses.every((response) => response.status === 200)).toBe(true);
    const stock = await item();
    expect(stock.quantitySold).toBe(0);
    expect(stock.quantityAvailable).toBe(3);
    expect(stock.quantityReserved).toBe(2);
  });

  it("explains every stored quantity through its movements", async () => {
    const listingId = (await createListing(2).expect(201)).body.id;
    await sell(listingId, 1);
    await patchListing(listingId, { status: ListingStatus.INACTIVE }).expect(
      200,
    );

    const report = await ledger.reconcileItem(itemId);
    expect(report.mismatches).toEqual([]);
    expect(report.tracked).toBe(true);
    expect(report.consistent).toBe(true);

    // A write bypassing the ledger is what reconciliation must surface.
    await database
      .getRepository(CollectionItem)
      .update({ id: itemId }, { quantityAvailable: 99 });
    expect((await ledger.reconcileItem(itemId)).consistent).toBe(false);
  });

  it("keeps an administrator's listing deletion on the same accounting", async () => {
    const listingId = (await createListing(2).expect(201)).body.id;

    await request(server)
      .delete(`/marketplace/listings/${listingId}`)
      .set(auth(admin))
      .expect(200);

    const stock = await item();
    expect(stock.quantityAvailable).toBe(5);
    expect(stock.quantityReserved).toBe(0);
  });

  // Declared last: rebuilding the table from the migration leaves the migrated
  // column types in place, which later assertions on this database do not expect.
  it("applies and rolls back its migration on the live database", async () => {
    const listingId = (await createListing(2).expect(201)).body.id;
    const migration =
      new InventoryMovementsAndListingReservations1788900000000();
    const runner = database.createQueryRunner();
    await runner.connect();
    try {
      await migration.down(runner);
      expect(
        await runner.query(
          `SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movement'`,
        ),
      ).toHaveLength(0);

      await migration.up(runner);
      const adopted = await runner.query(
        `SELECT "deltaReserved" FROM "inventory_movement"
          WHERE "collection_item_id" = $1 AND "kind" = 'opening_balance'`,
        [itemId],
      );
      expect(Number(adopted[0].deltaReserved)).toBe(2);
      const [restored] = await runner.query(
        `SELECT "inventoryReservedQuantity" FROM "listing" WHERE "id" = $1`,
        [listingId],
      );
      expect(Number(restored.inventoryReservedQuantity)).toBe(2);
      expect(
        await database.getRepository(InventoryMovement).count(),
      ).toBeGreaterThan(0);
    } finally {
      await runner.release();
    }
  });
});
