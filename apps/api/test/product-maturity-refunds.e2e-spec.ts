import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Server } from "http";
import Stripe from "stripe";
import request from "supertest";
import { DataSource } from "typeorm";
import { Currency } from "../src/common/enums/currency";
import { RefundStatus } from "../src/common/enums/refund-status";
import { Order, OrderStatus } from "../src/marketplace/entities/order.entity";
import { OrderItem } from "../src/marketplace/entities/order-item.entity";
import {
  PaymentTransaction,
  PaymentStatus,
  PaymentMethod,
} from "../src/marketplace/entities/payment-transaction.entity";
import { RefundOperation } from "../src/marketplace/entities/refund-operation.entity";
import { Listing } from "../src/marketplace/entities/listing.entity";
import { RefundFinanceService } from "../src/marketplace/refund-finance.service";
import { OrderService } from "../src/marketplace/order.service";
import { StripeService } from "../src/marketplace/stripe.service";
import { AuditService } from "../src/audit/audit.service";
import { OutboxService } from "../src/outbox/outbox.service";
import { OutboxEvent } from "../src/outbox/entities/outbox-event.entity";
import { RefundReservations1788768000000 } from "../src/migrations/1788768000000-RefundReservations";
import { createE2eApp } from "./helpers/app";
import { createAdminUser, createUser, TestUser } from "./helpers/auth";
import { seedListingForSeller } from "./helpers/marketplace";

jest.setTimeout(60000);

describe("Durable refund lifecycle (PostgreSQL, simulated provider)", () => {
  let app: INestApplication;
  let server: Server;
  let database: DataSource;
  let buyer: TestUser;
  let seller: TestUser;
  let admin: TestUser;
  let order: Order;
  let item: OrderItem;
  let intent: string;
  let listingId: number;
  const remote = new Map<string, Stripe.Refund>();
  const keys = new Map<string, Stripe.Refund>();
  let nextStatus: Stripe.Refund["status"] = "succeeded";
  let loseResponse = false;
  const provider = {
    onModuleInit: jest.fn(),
    listRefunds: jest.fn(async (pi: string) =>
      [...remote.values()].filter((refund) => refund.payment_intent === pi),
    ),
    retrieveRefund: jest.fn(async (id: string) => {
      const refund = remote.get(id);
      if (!refund) throw new Error("Provider refund not found");
      return { ...refund };
    }),
    findRefundForOperation: jest.fn(async (pi: string, id: string) =>
      [...remote.values()].find(
        (refund) =>
          refund.payment_intent === pi && refund.metadata?.operationId === id,
      ),
    ),
    createRefund: jest.fn(
      async (
        pi: string,
        amount: number,
        _reason: string,
        key: string,
        operationId: string,
      ) => {
        let refund = keys.get(key);
        if (!refund) {
          refund = {
            id: `re_${randomUUID()}`,
            object: "refund",
            payment_intent: pi,
            amount,
            currency: order.currency.toLowerCase(),
            metadata: { operationId },
            status: nextStatus,
            balance_transaction: null,
            charge: null,
            created: Math.floor(Date.now() / 1000),
            reason: null,
            receipt_number: null,
            source_transfer_reversal: null,
            transfer_reversal: null,
          };
          keys.set(key, refund);
          remote.set(refund.id, refund);
        }
        if (loseResponse) {
          loseResponse = false;
          throw new Error("Connection lost after provider commit");
        }
        return { ...refund };
      },
    ),
  };
  const auth = (user: TestUser) => ({
    Authorization: `Bearer ${user.accessToken}`,
  });
  const submit = (
    requestKey: string,
    amount: number,
    quantity = 0,
    shippingAmount = 0,
  ) =>
    request(server)
      .post(`/marketplace/orders/${order.id}/refund`)
      .set(auth(seller))
      .send({
        requestKey,
        lines: [{ orderItemId: item.id, amount, quantity, shippingAmount }],
      });
  const balance = async (user = buyer) =>
    (
      await request(server)
        .get(`/marketplace/orders/${order.id}/refunds/remaining`)
        .set(auth(user))
        .expect(200)
    ).body;
  const operations = () =>
    database
      .getRepository(RefundOperation)
      .find({ where: { order: { id: order.id } } });
  const reconcile = () =>
    app
      .get(OrderService)
      .handlePaymentRefunded(intent, "ignored_stale_event_ref", 999999);

  beforeAll(async () => {
    ({ app } = await createE2eApp({
      providerOverrides: [{ provide: StripeService, useValue: provider }],
    }));
    server = app.getHttpServer() as Server;
    database = app.get(DataSource);
    buyer = await createUser(server);
    seller = await createUser(server);
    admin = await createAdminUser(server, app);
    listingId = await seedListingForSeller(app, seller);
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(async () => {
    remote.clear();
    keys.clear();
    jest.clearAllMocks();
    nextStatus = "succeeded";
    loseResponse = false;
    order = await database.getRepository(Order).save({
      buyer: { id: buyer.id },
      totalAmount: 105,
      shippingAmount: 5,
      currency: Currency.EUR,
      status: OrderStatus.PAID,
    });
    item = await database.getRepository(OrderItem).save({
      order,
      seller: { id: seller.id },
      listing: { id: listingId },
      quantity: 2,
      unitPrice: 50,
      shippingCost: 5,
    });
    intent = `pi_refund_${order.id}`;
    await database.getRepository(PaymentTransaction).save({
      order,
      method: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.COMPLETED,
      transactionId: intent,
      amount: 105,
      currency: Currency.EUR,
    });
  });

  it("deduplicates simultaneous requests and rejects payload changes under the same key", async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => submit("same", 30)),
    );
    expect(responses.map((response) => response.status)).toEqual(
      Array(8).fill(201),
    );
    expect(new Set(responses.map((response) => response.body.id)).size).toBe(1);
    expect(await operations()).toHaveLength(1);
    expect(keys.size).toBe(1);
    await submit("same", 31).expect(409);
    expect((await balance()).remainingAmount).toBe(75);
  });

  it("reserves concurrent distinct refunds under a real order lock", async () => {
    nextStatus = "pending";
    const responses = await Promise.all([
      submit("first", 70),
      submit("second", 70),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 400,
    ]);
    expect(await operations()).toHaveLength(1);
    expect(keys.size).toBe(1);
    for (const viewer of [buyer, seller])
      expect(await balance(viewer)).toEqual({
        totalAmount: 105,
        alreadyRefunded: 0,
        remainingAmount: 35,
      });
  });

  it("recovers a lost successful response without refunding twice", async () => {
    loseResponse = true;
    await submit("lost", 60).expect(503);
    expect((await operations())[0].status).toBe(RefundStatus.PENDING);
    expect((await balance()).remainingAmount).toBe(45);
    await submit("lost", 60).expect(201);
    expect(provider.createRefund).toHaveBeenCalledTimes(1);
    expect((await operations())[0].status).toBe(RefundStatus.SUCCEEDED);
    expect(await balance()).toEqual({
      totalAmount: 105,
      alreadyRefunded: 60,
      remainingAmount: 45,
    });
  });

  it("retains ambiguous reservations when lookup fails and resumes the same durable operation", async () => {
    provider.findRefundForOperation.mockRejectedValueOnce(
      new Error("Provider unavailable"),
    );
    await submit("offline", 40).expect(503);
    const [pending] = await operations();
    expect(pending.providerAttemptedAt).toBeInstanceOf(Date);
    expect(provider.createRefund).not.toHaveBeenCalled();
    expect((await balance()).remainingAmount).toBe(65);
    await app.get(RefundFinanceService).executeRefund(pending.id);
    expect((await operations())[0].status).toBe(RefundStatus.SUCCEEDED);
  });

  it("rolls back the reservation if its audit cannot commit, before any provider mutation", async () => {
    const record = jest
      .spyOn(app.get(AuditService), "record")
      .mockRejectedValueOnce(new Error("Audit unavailable"));
    try {
      await submit("audit-rollback", 40).expect(500);
      expect(await operations()).toHaveLength(0);
      expect(provider.createRefund).not.toHaveBeenCalled();
    } finally {
      record.mockRestore();
    }
  });

  it("recovers when provider success precedes a rolled-back local outbox transaction", async () => {
    const record = jest
      .spyOn(app.get(OutboxService), "record")
      .mockRejectedValueOnce(new Error("Outbox unavailable"));
    try {
      await submit("outbox-rollback", 40).expect(503);
      expect((await operations())[0].status).toBe(RefundStatus.PENDING);
      await submit("outbox-rollback", 40).expect(201);
      expect(provider.createRefund).toHaveBeenCalledTimes(1);
      expect(
        await database.getRepository(OutboxEvent).countBy({
          eventType: "order.refund_created",
          aggregateId: String(order.id),
        }),
      ).toBe(1);
    } finally {
      record.mockRestore();
    }
  });

  it("keeps the reservation when the provider record does not match the requested amount", async () => {
    loseResponse = true;
    await submit("provider-mismatch", 40).expect(503);
    [...remote.values()][0].amount = 5000;
    await submit("provider-mismatch", 40).expect(409);
    expect((await operations())[0].status).toBe(RefundStatus.PENDING);
    expect((await balance()).remainingAmount).toBe(65);
  });

  it("ignores an old event snapshot and reads the current provider outcome", async () => {
    nextStatus = "pending";
    await submit("stale-event", 40).expect(201);
    const refund = [...remote.values()][0];
    const oldSnapshot = { ...refund };
    refund.status = "failed";
    provider.listRefunds.mockResolvedValueOnce([oldSnapshot]);
    await reconcile();
    expect((await operations())[0].status).toBe(RefundStatus.FAILED);
    expect((await balance()).remainingAmount).toBe(105);
  });

  it("does not recreate an ambiguous operation after provider idempotency can expire", async () => {
    provider.findRefundForOperation.mockRejectedValueOnce(
      new Error("Unavailable"),
    );
    await submit("old", 40).expect(503);
    const [pending] = await operations();
    await database.getRepository(RefundOperation).update(pending.id, {
      providerAttemptedAt: new Date(Date.now() - 25 * 3600000),
    });
    await submit("old", 40).expect(409);
    expect(provider.createRefund).not.toHaveBeenCalled();
    expect((await balance()).remainingAmount).toBe(65);
  });

  it("can recover a known remote operation even after the idempotency retention window", async () => {
    loseResponse = true;
    await submit("old-remote", 40).expect(503);
    const [pending] = await operations();
    await database.getRepository(RefundOperation).update(pending.id, {
      providerAttemptedAt: new Date(Date.now() - 25 * 3600000),
    });
    await submit("old-remote", 40).expect(201);
    expect(provider.createRefund).toHaveBeenCalledTimes(1);
  });

  it.each([
    { amount: 101, quantity: 0, shipping: 0 },
    { amount: 1, quantity: 3, shipping: 0 },
    { amount: 1, quantity: 0.5, shipping: 0 },
    { amount: 1.001, quantity: 0, shipping: 0 },
    { amount: 1, quantity: 0, shipping: 6 },
    { amount: -1, quantity: 0, shipping: 0 },
  ])("rejects invalid line bounds before any provider call: %j", async ({
    amount,
    quantity,
    shipping,
  }) => {
    await submit("invalid", amount, quantity, shipping).expect(400);
    expect(provider.createRefund).not.toHaveBeenCalled();
    expect(await operations()).toHaveLength(0);
  });

  it("rejects duplicate lines and cumulative quantities before provider calls", async () => {
    await request(server)
      .post(`/marketplace/orders/${order.id}/refund`)
      .set(auth(seller))
      .send({
        lines: Array(2).fill({ orderItemId: item.id, quantity: 1, amount: 1 }),
      })
      .expect(400);
    expect(provider.createRefund).not.toHaveBeenCalled();
    await submit("copies", 30, 2).expect(201);
    await submit("extra-copy", 1, 1).expect(400);
    await submit("adjustment", 10, 0).expect(201);
  });

  it("requires a completed matching payment and rolls back invalid reservations", async () => {
    await database
      .getRepository(PaymentTransaction)
      .update({ transactionId: intent }, { status: PaymentStatus.INITIATED });
    await submit("unpaid", 1).expect(409);
    await database
      .getRepository(PaymentTransaction)
      .update(
        { transactionId: intent },
        { status: PaymentStatus.COMPLETED, amount: 99 },
      );
    await submit("mismatch", 1).expect(409);
    expect(provider.createRefund).not.toHaveBeenCalled();
    expect(await operations()).toHaveLength(0);
  });

  it("keeps partial refunds paid and reconciles terminal outcomes once without changing stock", async () => {
    const initialStock = await database
      .getRepository(Listing)
      .findOneByOrFail({ id: listingId });
    nextStatus = "pending";
    await submit("partial", 40).expect(201);
    const refund = [...remote.values()][0];
    await reconcile();
    expect((await operations())[0].status).toBe(RefundStatus.PENDING);
    refund.status = "succeeded";
    await reconcile();
    await reconcile();
    expect(
      (await database.getRepository(Order).findOneByOrFail({ id: order.id }))
        .status,
    ).toBe(OrderStatus.PAID);
    expect(
      (
        await database
          .getRepository(PaymentTransaction)
          .findOneByOrFail({ transactionId: intent })
      ).status,
    ).toBe(PaymentStatus.COMPLETED);
    expect(
      await database.getRepository(OutboxEvent).countBy({
        eventType: "order.refund_created",
        aggregateId: String(order.id),
      }),
    ).toBe(1);
    expect(
      (await database.getRepository(Listing).findOneByOrFail({ id: listingId }))
        .quantityAvailable,
    ).toBe(initialStock.quantityAvailable);
    nextStatus = "succeeded";
    await submit("rest", 60, 0, 5).expect(201);
    expect(
      (await database.getRepository(Order).findOneByOrFail({ id: order.id }))
        .status,
    ).toBe(OrderStatus.REFUNDED);
    expect(
      (
        await database
          .getRepository(PaymentTransaction)
          .findOneByOrFail({ transactionId: intent })
      ).status,
    ).toBe(PaymentStatus.REFUNDED);
    await submit("rest", 60, 0, 5).expect(201);
    expect(await operations()).toHaveLength(2);
  });

  it("releases failed refunds but does not reinterpret a retry as a new payment", async () => {
    nextStatus = "pending";
    await submit("fail", 100, 2, 5).expect(201);
    [...remote.values()][0].status = "failed";
    await reconcile();
    await reconcile();
    expect((await operations())[0].status).toBe(RefundStatus.FAILED);
    expect((await balance()).remainingAmount).toBe(105);
    await submit("fail", 100, 2, 5).expect(201);
    expect(provider.createRefund).toHaveBeenCalledTimes(1);
    nextStatus = "succeeded";
    await submit("new-intentional-request", 100, 2, 5).expect(201);
  });

  it("restores the prior fulfillment state if the bank rejects a previously successful full refund", async () => {
    await database
      .getRepository(Order)
      .update(order.id, { status: OrderStatus.DELIVERED });
    await submit("full", 100, 2, 5).expect(201);
    [...remote.values()][0].status = "failed";
    await reconcile();
    expect(
      (await database.getRepository(Order).findOneByOrFail({ id: order.id }))
        .status,
    ).toBe(OrderStatus.DELIVERED);
    expect(
      (
        await database
          .getRepository(PaymentTransaction)
          .findOneByOrFail({ transactionId: intent })
      ).status,
    ).toBe(PaymentStatus.COMPLETED);
    expect((await balance()).remainingAmount).toBe(105);
  });

  it("imports provider-only partial refunds once and blocks unsafe line attribution", async () => {
    const refund = {
      id: "re_external",
      payment_intent: intent,
      amount: 1000,
      currency: "eur",
      metadata: {},
      status: "succeeded",
    } as Stripe.Refund;
    remote.set(refund.id, refund);
    await reconcile();
    await reconcile();
    expect(await operations()).toHaveLength(1);
    expect((await balance()).alreadyRefunded).toBe(10);
    expect((await balance(seller)).remainingAmount).toBe(0);
    await submit("unallocated", 1).expect(409);
    expect(provider.createRefund).not.toHaveBeenCalled();
  });

  it("allocates staff amount-only requests and conservatively deduplicates legacy clients", async () => {
    const send = () =>
      request(server)
        .post(`/marketplace/orders/${order.id}/refund`)
        .set(auth(admin))
        .send({ amount: 100.29, reason: "Order adjustment" });
    await send().expect(201);
    await send().expect(201);
    expect(keys.size).toBe(1);
    expect((await balance()).remainingAmount).toBe(4.71);
  });

  it("uses zero-decimal provider units for JPY", async () => {
    order.currency = Currency.JPY;
    await database
      .getRepository(Order)
      .update(order.id, { currency: Currency.JPY });
    await database
      .getRepository(PaymentTransaction)
      .update({ transactionId: intent }, { currency: Currency.JPY });
    await submit("yen-fraction", 0.5).expect(400);
    await submit("yen", 100).expect(201);
    expect([...remote.values()][0].amount).toBe(100);
    expect((await balance()).alreadyRefunded).toBe(100);
  });

  it("applies the additive migration to a real legacy table without altering historical amounts", async () => {
    const runner = database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(`CREATE SCHEMA refund_migration_fixture`);
      await runner.query(`SET LOCAL search_path TO refund_migration_fixture`);
      await runner.query(
        `CREATE TABLE refund_operation (id serial PRIMARY KEY, order_id integer NOT NULL, amount numeric(10,2) NOT NULL)`,
      );
      await runner.query(
        `INSERT INTO refund_operation (order_id, amount) VALUES (1, 12.34), (1, 56.78)`,
      );
      const migration = new RefundReservations1788768000000();
      await migration.up(runner);
      expect(
        await runner.query(
          `SELECT amount, "requestKey" FROM refund_operation ORDER BY id`,
        ),
      ).toEqual([
        { amount: "12.34", requestKey: null },
        { amount: "56.78", requestKey: null },
      ]);
      await runner.query(
        `INSERT INTO refund_operation (order_id, amount, "requestKey") VALUES (2, 1, 'same'), (3, 1, 'same')`,
      );
      await runner.query(`SAVEPOINT duplicate_key`);
      await expect(
        runner.query(
          `INSERT INTO refund_operation (order_id, amount, "requestKey") VALUES (2, 1, 'same')`,
        ),
      ).rejects.toThrow(/duplicate key/);
      await runner.query(`ROLLBACK TO SAVEPOINT duplicate_key`);
      await migration.down(runner);
      expect(
        await runner.query(
          `SELECT amount FROM refund_operation WHERE order_id = 1 ORDER BY id`,
        ),
      ).toEqual([{ amount: "12.34" }, { amount: "56.78" }]);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
