import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { DataSource } from "typeorm";
import { ClaimCategory } from "../src/common/enums/claim-category";
import { Currency } from "../src/common/enums/currency";
import { FulfillmentStatus } from "../src/common/enums/fulfillment-status";
import { Notification } from "../src/notification/entities/notification.entity";
import { Order, OrderStatus } from "../src/marketplace/entities/order.entity";
import { OrderItem } from "../src/marketplace/entities/order-item.entity";
import {
  OutboxEvent,
  OutboxEventStatus,
} from "../src/outbox/entities/outbox-event.entity";
import { ProcessedEvent } from "../src/outbox/entities/processed-event.entity";
import { OutboxService } from "../src/outbox/outbox.service";
import { ProcessedEvents1789300000000 } from "../src/migrations/1789300000000-ProcessedEvents";
import { createE2eApp } from "./helpers/app";
import { createUser, TestUser } from "./helpers/auth";
import { seedListingForSeller } from "./helpers/marketplace";

jest.setTimeout(60000);

describe("Domain event delivery (PostgreSQL)", () => {
  let app: INestApplication;
  let server: Server;
  let database: DataSource;
  let outbox: OutboxService;
  let buyer: TestUser;
  let seller: TestUser;
  let listingId: number;
  let order: Order;
  let item: OrderItem;

  const auth = (user: TestUser) => ({
    Authorization: `Bearer ${user.accessToken}`,
  });

  const events = (eventType: string) =>
    database.getRepository(OutboxEvent).find({ where: { eventType } });

  const notificationsOf = (userId: number) =>
    database.getRepository(Notification).find({
      where: { user: { id: userId } },
    });

  const claims = () => database.getRepository(ProcessedEvent).find();

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    server = app.getHttpServer() as Server;
    database = app.get(DataSource);
    outbox = app.get(OutboxService);
    buyer = await createUser(server);
    seller = await createUser(server);
    listingId = await seedListingForSeller(app, seller);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await database.query(`DELETE FROM "processed_event"`);
    await database.query(`DELETE FROM "outbox_event"`);
    await database.query(`DELETE FROM "notification"`);

    order = await database.getRepository(Order).save({
      buyer: { id: buyer.id },
      totalAmount: 50,
      shippingAmount: 0,
      currency: Currency.EUR,
      status: OrderStatus.PAID,
    } as unknown as Order);
    item = await database.getRepository(OrderItem).save({
      order,
      seller: { id: seller.id },
      listing: { id: listingId },
      quantity: 1,
      unitPrice: 50,
      shippingCost: 0,
      fulfillmentStatus: FulfillmentStatus.SHIPPED,
    } as unknown as OrderItem);
  });

  it("delivers a buyer claim to the seller it names", async () => {
    await request(server)
      .post(`/marketplace/orders/${order.id}/items/${item.id}/claim`)
      .set(auth(buyer))
      .send({
        claimCategory: ClaimCategory.DAMAGED_ITEM,
        subject: "Damaged card",
        message: "The card arrived bent",
      })
      .expect(201);

    // The audited defect: the claim was published under a name no consumer knew.
    const [claim] = await events("order.item_claim_created");
    expect(claim).toBeTruthy();
    expect(claim.payload.sellerUserId).toBe(seller.id);

    const result = await outbox.processPendingEvents();

    expect(result).toEqual({ processed: 1, failed: 0 });
    const delivered = await notificationsOf(seller.id);
    expect(delivered).toHaveLength(1);
    expect(delivered[0].type).toBe("order.item_claim_created");
  });

  it("names the seller on a delivery confirmation and a return request", async () => {
    await request(server)
      .post(`/marketplace/orders/${order.id}/items/${item.id}/confirm-receipt`)
      .set(auth(buyer))
      .expect(201);
    await request(server)
      .post(`/marketplace/orders/${order.id}/items/${item.id}/returns`)
      .set(auth(buyer))
      .send({ quantity: 1, reason: "Wrong card" })
      .expect(201);

    const [delivery] = await events("order.item_delivered");
    const [returned] = await events("order.return_requested");
    expect(delivery.payload.sellerUserId).toBe(seller.id);
    expect(returned.payload.sellerUserId).toBe(seller.id);

    await outbox.processPendingEvents();

    const delivered = await notificationsOf(seller.id);
    expect(delivered.map((entry) => entry.type).sort()).toEqual([
      "order.item_delivered",
      "order.return_requested",
    ]);
  });

  it("delivers each event to each consumer exactly once across redeliveries", async () => {
    await request(server)
      .post(`/marketplace/orders/${order.id}/items/${item.id}/claim`)
      .set(auth(buyer))
      .send({
        claimCategory: ClaimCategory.MISSING_ITEM,
        subject: "Missing card",
        message: "Nothing in the envelope",
      })
      .expect(201);

    await outbox.processPendingEvents();
    // A redelivery, as an administrative replay or a second worker would cause.
    await database
      .getRepository(OutboxEvent)
      .update(
        { eventType: "order.item_claim_created" },
        { status: OutboxEventStatus.PENDING, processedAt: null },
      );
    await outbox.processPendingEvents();

    expect(await notificationsOf(seller.id)).toHaveLength(1);
    const recorded = await claims();
    expect(recorded).toHaveLength(1);
    expect(recorded[0].consumer).toBe("notification:order.item_claim_created");
  });

  it("keeps an event nobody consumes out of the processed set", async () => {
    await database.getRepository(OutboxEvent).save({
      eventType: "order.pending",
      aggregateType: "order",
      aggregateId: String(order.id),
      payload: {
        orderId: order.id,
        previousStatus: "Paid",
        nextStatus: "Pending",
      },
      status: OutboxEventStatus.PENDING,
      retryCount: 0,
    } as unknown as OutboxEvent);

    const result = await outbox.processPendingEvents();

    expect(result.failed).toBe(1);
    const [stored] = await events("order.pending");
    expect(stored.status).not.toBe(OutboxEventStatus.PROCESSED);
    expect(stored.lastError).toContain("No consumer registered");
  });

  it("retries a delivery that failed instead of reporting it delivered", async () => {
    await request(server)
      .post(`/marketplace/orders/${order.id}/items/${item.id}/claim`)
      .set(auth(buyer))
      .send({
        claimCategory: ClaimCategory.WRONG_ITEM,
        subject: "Wrong card",
        message: "Received another card",
      })
      .expect(201);
    // A recipient the event cannot name makes its consumer fail.
    await database
      .getRepository(OutboxEvent)
      .update(
        { eventType: "order.item_claim_created" },
        {
          payload: {
            ticketId: 1,
            orderId: order.id,
            orderItemId: item.id,
            claimCategory: "wrong_item",
            buyerId: buyer.id,
            sellerUserId: null as unknown as number,
          },
        },
      );

    const failing = await outbox.processPendingEvents();
    expect(failing.failed).toBe(1);
    expect(await notificationsOf(seller.id)).toHaveLength(0);
    expect(await claims()).toHaveLength(0);

    // Once the payload names its recipient, the retry delivers it.
    await database
      .getRepository(OutboxEvent)
      .update(
        { eventType: "order.item_claim_created" },
        {
          payload: {
            ticketId: 1,
            orderId: order.id,
            orderItemId: item.id,
            claimCategory: "wrong_item",
            buyerId: buyer.id,
            sellerUserId: seller.id,
          },
        },
      );
    const retried = await outbox.processPendingEvents();

    expect(retried.processed).toBe(1);
    expect(await notificationsOf(seller.id)).toHaveLength(1);
  });

  // Declared last: rebuilding the table from the migration leaves the migrated
  // column types in place, which later assertions on this database do not expect.
  it("applies and rolls back its migration on the live database", async () => {
    const migration = new ProcessedEvents1789300000000();
    const runner = database.createQueryRunner();
    await runner.connect();
    try {
      await migration.down(runner);
      expect(
        await runner.query(
          `SELECT 1 FROM information_schema.tables WHERE table_name = 'processed_event'`,
        ),
      ).toHaveLength(0);

      await migration.up(runner);
      const constraints = await runner.query(
        `SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'processed_event'
            AND constraint_name = 'UQ_processed_event_consumer_event'`,
      );
      expect(constraints).toHaveLength(1);
    } finally {
      await runner.release();
    }
  });
});
