import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import Stripe from "stripe";
import request from "supertest";
import { DataSource } from "typeorm";
import { AdminOpsService } from "../src/admin-ops/admin-ops.service";
import { Listing } from "../src/marketplace/entities/listing.entity";
import { Order, OrderStatus } from "../src/marketplace/entities/order.entity";
import {
  PaymentStatus,
  PaymentTransaction,
} from "../src/marketplace/entities/payment-transaction.entity";
import { OrderService } from "../src/marketplace/order.service";
import { StripeService } from "../src/marketplace/stripe.service";
import { CheckoutRecoveryAndCompensation1789200000000 } from "../src/migrations/1789200000000-CheckoutRecoveryAndCompensation";
import { createE2eApp } from "./helpers/app";
import { createAdminUser, createUser, TestUser } from "./helpers/auth";
import { seedListingForSeller } from "./helpers/marketplace";

jest.setTimeout(60000);

describe("Checkout recovery and compensation (PostgreSQL, simulated provider)", () => {
  let app: INestApplication;
  let server: Server;
  let database: DataSource;
  let orders: OrderService;
  let ops: AdminOpsService;
  let buyer: TestUser;
  let seller: TestUser;
  let admin: TestUser;
  let listingId: number;

  const intents = new Map<string, Stripe.PaymentIntent>();
  const keys = new Map<string, Stripe.PaymentIntent>();
  const refunds: Stripe.Refund[] = [];

  const provider = {
    onModuleInit: jest.fn(),
    createPaymentIntent: jest.fn(
      async (
        amount: number,
        currency: string,
        metadata: Record<string, string>,
        idempotencyKey?: string,
      ) => {
        const existing = idempotencyKey ? keys.get(idempotencyKey) : undefined;
        if (existing) return { ...existing };
        const intent = {
          id: `pi_${idempotencyKey ?? intents.size}`,
          object: "payment_intent",
          amount: Math.round(amount * 100),
          currency,
          metadata,
          status: "requires_payment_method",
          client_secret: `secret_${idempotencyKey ?? intents.size}`,
        } as unknown as Stripe.PaymentIntent;
        if (idempotencyKey) keys.set(idempotencyKey, intent);
        intents.set(intent.id, intent);
        return { ...intent };
      },
    ),
    retrievePaymentIntent: jest.fn(async (id: string) => {
      const intent = intents.get(id);
      if (!intent) throw new Error("No such payment intent");
      return { ...intent };
    }),
    cancelPaymentIntent: jest.fn(async (id: string) => {
      const intent = intents.get(id);
      if (!intent) throw new Error("No such payment intent");
      if (intent.status === "succeeded") {
        throw new Error("Intent already succeeded and cannot be cancelled");
      }
      intent.status = "canceled";
      return { ...intent };
    }),
    createRefund: jest.fn(
      async (paymentIntentId: string, _amount, _reason, key: string) => {
        const refund = {
          id: `re_${key}`,
          object: "refund",
          payment_intent: paymentIntentId,
          amount: intents.get(paymentIntentId)?.amount ?? 0,
          currency: "eur",
          status: "succeeded",
          metadata: {},
        } as unknown as Stripe.Refund;
        if (!refunds.some((existing) => existing.id === refund.id)) {
          refunds.push(refund);
        }
        return { ...refund };
      },
    ),
    listRefunds: jest.fn(async (paymentIntentId: string) =>
      refunds.filter((refund) => refund.payment_intent === paymentIntentId),
    ),
    retrieveRefund: jest.fn(async (id: string) => ({
      ...refunds.find((refund) => refund.id === id)!,
    })),
    findRefundForOperation: jest.fn(async () => undefined),
  };

  const auth = (user: TestUser) => ({
    Authorization: `Bearer ${user.accessToken}`,
  });

  const addToCart = (quantity = 1) =>
    request(server)
      .post("/user-cart/items")
      .set(auth(buyer))
      .send({ listingId, quantity });

  const checkout = (
    attemptKey?: string,
    shippingAddress = "12 rue des Cartes",
  ): request.Test =>
    request(server)
      .post("/marketplace/checkout")
      .set(auth(buyer))
      .send({ shippingAddress, ...(attemptKey ? { attemptKey } : {}) });

  const cancel = (orderId: number) =>
    request(server)
      .post(`/marketplace/orders/${orderId}/cancel`)
      .set(auth(buyer));

  const listingStock = async (): Promise<number> =>
    (await database.getRepository(Listing).findOneByOrFail({ id: listingId }))
      .quantityAvailable;

  const paymentOf = async (orderId: number): Promise<PaymentTransaction> =>
    database.getRepository(PaymentTransaction).findOneOrFail({
      where: { order: { id: orderId } },
      order: { createdAt: "DESC" },
    });

  beforeAll(async () => {
    ({ app } = await createE2eApp({
      providerOverrides: [{ provide: StripeService, useValue: provider }],
    }));
    server = app.getHttpServer() as Server;
    database = app.get(DataSource);
    orders = app.get(OrderService);
    ops = app.get(AdminOpsService);
    buyer = await createUser(server);
    seller = await createUser(server);
    admin = await createAdminUser(server, app);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    intents.clear();
    keys.clear();
    refunds.length = 0;
    jest.clearAllMocks();
    listingId = await seedListingForSeller(app, seller, {
      quantityAvailable: 5,
    });
    // Each test starts from an empty order book so the compensation queue and
    // the expiry sweep only ever see its own candidates.
    for (const table of [
      "cart_item",
      "payment_transaction",
      "order_item",
      "order",
    ]) {
      await database.query(`DELETE FROM "${table}"`);
    }
  });

  it("resumes an attempt key and refuses one describing another cart", async () => {
    await addToCart(1).expect(201);
    const first = (await checkout("attempt-a").expect(201)).body;

    // The cart is cleared by the first checkout, so a retry resumes the order.
    const replay = (await checkout("attempt-a").expect(201)).body;
    expect(replay.orderId).toBe(first.orderId);
    expect(replay.clientSecret).toBe(first.clientSecret);

    await addToCart(2).expect(201);
    await checkout("attempt-a").expect(409);
    expect(await database.getRepository(Order).count()).toBe(1);
  });

  it("recovers a checkout interrupted before its provider intent was recorded", async () => {
    await addToCart(1).expect(201);
    const started = (await checkout("attempt-recover").expect(201)).body;

    // Simulates a crash between order creation and payment persistence.
    await database
      .getRepository(PaymentTransaction)
      .delete({ order: { id: started.orderId } });

    const resumed = (await checkout("attempt-recover").expect(201)).body;

    expect(resumed.orderId).toBe(started.orderId);
    expect(resumed.clientSecret).toBeTruthy();
    // The same idempotency key was reused, so no second chargeable intent exists.
    expect(intents.size).toBe(1);
    expect((await paymentOf(started.orderId)).transactionId).toBe(
      resumed.clientSecret.replace("secret_", "pi_"),
    );
  });

  it("releases the stock once under concurrent buyer cancellations", async () => {
    await addToCart(2).expect(201);
    const order = (await checkout().expect(201)).body;
    expect(await listingStock()).toBe(3);

    const responses = await Promise.all([
      cancel(order.orderId),
      cancel(order.orderId),
      cancel(order.orderId),
    ]);

    expect(responses.every((response) => response.status === 201)).toBe(true);
    expect(await listingStock()).toBe(5);
    const stored = await database
      .getRepository(Order)
      .findOneByOrFail({ id: order.orderId });
    expect(stored.status).toBe(OrderStatus.CANCELLED);
    expect(stored.stockReleased).toBe(true);
  });

  it("cancels the provider intent when the buyer abandons the checkout", async () => {
    await addToCart(1).expect(201);
    const order = (await checkout().expect(201)).body;
    const payment = await paymentOf(order.orderId);

    await cancel(order.orderId).expect(201);

    expect(provider.cancelPaymentIntent).toHaveBeenCalledWith(
      payment.transactionId,
    );
    expect(intents.get(payment.transactionId!)!.status).toBe("canceled");
    expect((await paymentOf(order.orderId)).status).toBe(PaymentStatus.FAILED);
  });

  it("records compensation when a payment succeeds after cancellation", async () => {
    await addToCart(1).expect(201);
    const order = (await checkout().expect(201)).body;
    const payment = await paymentOf(order.orderId);
    await cancel(order.orderId).expect(201);

    // The provider captures the money anyway, racing the cancellation.
    intents.get(payment.transactionId!)!.status = "succeeded";
    await orders.handlePaymentSucceeded(payment.transactionId!, {
      amount: Math.round(Number(order.amount) * 100),
      currency: order.currency.toLowerCase(),
      metadata: { orderId: String(order.orderId) },
    });

    const stored = await database
      .getRepository(Order)
      .findOneByOrFail({ id: order.orderId });
    // The cancelled order is not resurrected and the stock stays released.
    expect(stored.status).toBe(OrderStatus.CANCELLED);
    expect(await listingStock()).toBe(5);

    const owed = await paymentOf(order.orderId);
    expect(owed.compensationRequiredAt).toBeTruthy();
    expect(owed.compensatedAt).toBeNull();
    expect((await ops.getMetrics()).orders.paymentsAwaitingCompensation).toBe(
      1,
    );
  });

  it("refunds an owed capture once through the operational endpoint", async () => {
    await addToCart(1).expect(201);
    const order = (await checkout().expect(201)).body;
    const payment = await paymentOf(order.orderId);
    await cancel(order.orderId).expect(201);
    intents.get(payment.transactionId!)!.status = "succeeded";
    await orders.handlePaymentSucceeded(payment.transactionId!, {
      amount: Math.round(Number(order.amount) * 100),
      currency: order.currency.toLowerCase(),
      metadata: { orderId: String(order.orderId) },
    });

    const owed = (
      await request(server)
        .get("/admin/ops/payments/compensation")
        .set(auth(admin))
        .expect(200)
    ).body;
    expect(owed).toHaveLength(1);

    await request(server)
      .post(`/admin/ops/payments/${owed[0].id}/compensate`)
      .set(auth(admin))
      .expect(200);
    await request(server)
      .post(`/admin/ops/payments/${owed[0].id}/compensate`)
      .set(auth(admin))
      .expect(200);

    expect(provider.createRefund).toHaveBeenCalledTimes(1);
    expect((await paymentOf(order.orderId)).compensatedAt).toBeTruthy();
    expect(
      (
        await request(server)
          .get("/admin/ops/payments/compensation")
          .set(auth(admin))
          .expect(200)
      ).body,
    ).toHaveLength(0);
  });

  it("expires only stale reservations and never a paid order", async () => {
    await addToCart(1).expect(201);
    const stale = (await checkout().expect(201)).body;
    await database
      .getRepository(Order)
      .update({ id: stale.orderId }, { reservationExpiresAt: new Date(0) });

    await addToCart(1).expect(201);
    const paid = (await checkout().expect(201)).body;
    const paidPayment = await paymentOf(paid.orderId);
    intents.get(paidPayment.transactionId!)!.status = "succeeded";
    await orders.handlePaymentSucceeded(paidPayment.transactionId!, {
      amount: Math.round(Number(paid.amount) * 100),
      currency: paid.currency.toLowerCase(),
      metadata: { orderId: String(paid.orderId) },
    });
    await database
      .getRepository(Order)
      .update({ id: paid.orderId }, { reservationExpiresAt: new Date(0) });

    const first = await request(server)
      .post("/admin/ops/orders/expire-stale")
      .set(auth(admin))
      .send({})
      .expect(200);
    const second = await request(server)
      .post("/admin/ops/orders/expire-stale")
      .set(auth(admin))
      .send({})
      .expect(200);

    expect(first.body.expiredCount).toBe(1);
    // A second sweep finds nothing: the first one already settled the candidate.
    expect(second.body.expiredCount).toBe(0);
    expect(
      (
        await database
          .getRepository(Order)
          .findOneByOrFail({ id: paid.orderId })
      ).status,
    ).toBe(OrderStatus.PAID);
    expect(
      (
        await database
          .getRepository(Order)
          .findOneByOrFail({ id: stale.orderId })
      ).status,
    ).toBe(OrderStatus.CANCELLED);
    // Four of the five copies came back: one stays sold to the paid order.
    expect(await listingStock()).toBe(4);
  });

  it("reports settlement reconciliation per currency and against the ledger", async () => {
    const report = (
      await request(server)
        .get("/admin/ops/settlement/reconcile")
        .set(auth(admin))
        .expect(200)
    ).body;

    expect(report.ledgerConsistent).toBe(true);
    expect(report.ledgerDiscrepancies).toEqual([]);
    expect(Array.isArray(report.byCurrency)).toBe(true);
    expect(report.isReconciled).toBe(true);
  });

  // Declared last: rebuilding the columns from the migration leaves the migrated
  // types in place, which later assertions on this database do not expect.
  it("applies and rolls back its migration on the live database", async () => {
    const migration = new CheckoutRecoveryAndCompensation1789200000000();
    const runner = database.createQueryRunner();
    await runner.connect();
    try {
      await migration.down(runner);
      expect(
        await runner.query(
          `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'payment_transaction'
              AND column_name = 'compensationRequiredAt'`,
        ),
      ).toHaveLength(0);

      await migration.up(runner);
      const columns = await runner.query(
        `SELECT column_name FROM information_schema.columns
          WHERE (table_name = 'payment_transaction'
                 AND column_name IN ('compensationRequiredAt', 'compensatedAt'))
             OR (table_name = 'order' AND column_name = 'checkoutFingerprint')`,
      );
      expect(columns).toHaveLength(3);
    } finally {
      await runner.release();
    }
  });
});
