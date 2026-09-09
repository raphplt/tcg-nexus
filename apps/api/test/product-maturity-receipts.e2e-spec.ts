import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { DataSource } from "typeorm";
import { CollectionItem } from "../src/collection-item/entities/collection-item.entity";
import { Currency } from "../src/common/enums/currency";
import { FulfillmentStatus } from "../src/common/enums/fulfillment-status";
import { Order, OrderStatus } from "../src/marketplace/entities/order.entity";
import { OrderItem } from "../src/marketplace/entities/order-item.entity";
import { ReceiptImport } from "../src/marketplace/entities/receipt-import.entity";
import { ReceiptImports1789000000000 } from "../src/migrations/1789000000000-ReceiptImports";
import { createE2eApp } from "./helpers/app";
import { createAdminUser, createUser, TestUser } from "./helpers/auth";
import { seedListingForSeller } from "./helpers/marketplace";

jest.setTimeout(60000);

describe("Delivery receipt identity (PostgreSQL)", () => {
  let app: INestApplication;
  let server: Server;
  let database: DataSource;
  let buyer: TestUser;
  let seller: TestUser;
  let admin: TestUser;
  let listingId: number;
  let order: Order;
  let item: OrderItem;
  let firstCollection: string;
  let secondCollection: string;

  const auth = (user: TestUser) => ({
    Authorization: `Bearer ${user.accessToken}`,
  });

  const createCollection = async (name: string): Promise<string> =>
    (
      await request(server)
        .post("/collection")
        .set(auth(buyer))
        .send({ name: `${name} ${Date.now()}`, isPublic: false })
        .expect(201)
    ).body.id;

  const confirmReceipt = () =>
    request(server)
      .post(`/marketplace/orders/${order.id}/items/${item.id}/confirm-receipt`)
      .set(auth(buyer));

  const importInto = (
    collectionId: string,
    body: Record<string, unknown> = {},
    user: TestUser = buyer,
  ) =>
    request(server)
      .post(`/marketplace/orders/${order.id}/receipt-import`)
      .set(auth(user))
      .send({
        collectionId,
        items: [{ orderItemId: item.id, ...body }],
        allowDuplicates: body.allowDuplicates ?? true,
      });

  const preview = async () =>
    (
      await request(server)
        .get(`/marketplace/orders/${order.id}/receipt-preview`)
        .set(auth(buyer))
        .expect(200)
    ).body;

  const receiptCount = () =>
    database
      .getRepository(ReceiptImport)
      .count({ where: { orderItem: { id: item.id } } });

  const importedItems = () =>
    database.getRepository(CollectionItem).find({
      where: [
        { collection: { id: firstCollection } },
        { collection: { id: secondCollection } },
      ],
    });

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    server = app.getHttpServer() as Server;
    database = app.get(DataSource);
    buyer = await createUser(server);
    seller = await createUser(server);
    admin = await createAdminUser(server, app);
    listingId = await seedListingForSeller(app, seller);
    firstCollection = await createCollection("Receipts A");
    secondCollection = await createCollection("Receipts B");
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await database.query(`DELETE FROM "receipt_import"`);
    await database.query(
      `DELETE FROM "collection_item" WHERE "provenance" IS NOT NULL`,
    );

    order = await database.getRepository(Order).save({
      buyer: { id: buyer.id },
      totalAmount: 100,
      shippingAmount: 0,
      currency: Currency.EUR,
      status: OrderStatus.DELIVERED,
    } as unknown as Order);
    item = await database.getRepository(OrderItem).save({
      order,
      seller: { id: seller.id },
      listing: { id: listingId },
      quantity: 2,
      unitPrice: 50,
      shippingCost: 0,
      productName: "Charizard ex",
      productCondition: "NM",
      fulfillmentStatus: FulfillmentStatus.SHIPPED,
    } as unknown as OrderItem);
  });

  it("refuses a receipt the buyer has not confirmed, and accepts it afterwards", async () => {
    // A seller declaring delivery is not the buyer confirming receipt.
    await database
      .getRepository(OrderItem)
      .update(
        { id: item.id },
        { fulfillmentStatus: FulfillmentStatus.DELIVERED },
      );
    await importInto(firstCollection).expect(400);

    await confirmReceipt().expect(201);
    await importInto(firstCollection).expect(200);
    expect(await receiptCount()).toBe(1);
  });

  it("counts a purchase received into one collection against every other", async () => {
    await confirmReceipt().expect(201);
    await importInto(firstCollection).expect(200);

    // The audited defect: the same delivered line imported into a second
    // collection created the purchased copies a second time.
    await importInto(secondCollection).expect(400);

    const items = await importedItems();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect((await preview()).items[0].remainingQuantity).toBe(0);
  });

  it("splits a purchase across collections without exceeding it", async () => {
    await confirmReceipt().expect(201);

    await importInto(firstCollection, { quantity: 1 }).expect(200);
    expect((await preview()).items[0].remainingQuantity).toBe(1);

    await importInto(secondCollection, { quantity: 1 }).expect(200);
    await importInto(secondCollection, {
      quantity: 1,
      requestKey: "third-copy",
    }).expect(400);

    const items = await importedItems();
    expect(items.map((entry) => entry.quantity).sort()).toEqual([1, 1]);
    expect(await receiptCount()).toBe(2);
  });

  it("returns the same receipt for a retried request", async () => {
    await confirmReceipt().expect(201);

    const responses = await Promise.all([
      importInto(firstCollection, { requestKey: "retry" }),
      importInto(firstCollection, { requestKey: "retry" }),
      importInto(firstCollection, { requestKey: "retry" }),
    ]);

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(await receiptCount()).toBe(1);
    expect(await importedItems()).toHaveLength(1);
  });

  it("never receives more copies than purchased under concurrent imports", async () => {
    await confirmReceipt().expect(201);

    const responses = await Promise.all([
      importInto(firstCollection, { quantity: 2, requestKey: "a" }),
      importInto(secondCollection, { quantity: 2, requestKey: "b" }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 400,
    ]);
    const items = await importedItems();
    expect(items.reduce((total, entry) => total + entry.quantity, 0)).toBe(2);
  });

  it("keeps a deleted collection item from freeing the purchase again", async () => {
    await confirmReceipt().expect(201);
    await importInto(firstCollection).expect(200);
    const [imported] = await importedItems();

    await database.getRepository(CollectionItem).delete({ id: imported.id });

    await importInto(secondCollection).expect(400);
    expect(await receiptCount()).toBe(1);
  });

  it("lets staff file a receipt in the buyer's collection during support work", async () => {
    await database
      .getRepository(OrderItem)
      .update(
        { id: item.id },
        { fulfillmentStatus: FulfillmentStatus.DELIVERED },
      );

    await importInto(firstCollection, {}, admin).expect(200);

    const items = await importedItems();
    expect(items).toHaveLength(1);
    expect(await receiptCount()).toBe(1);
    // The buyer's own attempt then finds nothing left to receive.
    await importInto(secondCollection).expect(400);
  });

  // Declared last: rebuilding the table from the migration leaves the migrated
  // column types in place, which later assertions on this database do not expect.
  it("adopts pre-existing imports when its migration is applied", async () => {
    await confirmReceipt().expect(201);
    await importInto(firstCollection).expect(200);
    const [imported] = await importedItems();

    const migration = new ReceiptImports1789000000000();
    const runner = database.createQueryRunner();
    await runner.connect();
    try {
      await migration.down(runner);
      expect(
        await runner.query(
          `SELECT 1 FROM information_schema.tables WHERE table_name = 'receipt_import'`,
        ),
      ).toHaveLength(0);

      await migration.up(runner);
      const adopted = await runner.query(
        `SELECT "quantity", "requestKey" FROM "receipt_import" WHERE "order_item_id" = $1`,
        [item.id],
      );
      expect(adopted).toHaveLength(1);
      expect(Number(adopted[0].quantity)).toBe(2);
      expect(adopted[0].requestKey).toBe(`legacy:${imported.id}`);
    } finally {
      await runner.release();
    }
  });
});
