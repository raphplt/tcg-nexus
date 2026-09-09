import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import Stripe from "stripe";
import request from "supertest";
import { DataSource } from "typeorm";
import { AuditEvent } from "../src/audit/entities/audit-event.entity";
import { ClaimCategory } from "../src/common/enums/claim-category";
import { Currency } from "../src/common/enums/currency";
import { FulfillmentStatus } from "../src/common/enums/fulfillment-status";
import {
  PayoutMethod,
  PayoutStatus,
  SellerAllocationStatus,
} from "../src/common/enums/seller-settlement";
import { Order, OrderStatus } from "../src/marketplace/entities/order.entity";
import {
  PaymentMethod,
  PaymentStatus,
  PaymentTransaction,
} from "../src/marketplace/entities/payment-transaction.entity";
import { OrderItem } from "../src/marketplace/entities/order-item.entity";
import { SellerAllocation } from "../src/marketplace/entities/seller-allocation.entity";
import { SellerLedgerEntry } from "../src/marketplace/entities/seller-ledger-entry.entity";
import { SellerPayout } from "../src/marketplace/entities/seller-payout.entity";
import { SellerSettlementAccount } from "../src/marketplace/entities/seller-settlement-account.entity";
import { SellerLedgerAndPayoutExecution1788800000000 } from "../src/migrations/1788800000000-SellerLedgerAndPayoutExecution";
import { SellerSettlementService } from "../src/marketplace/seller-settlement.service";
import { StripeService } from "../src/marketplace/stripe.service";
import { createE2eApp } from "./helpers/app";
import { createAdminUser, createUser, TestUser } from "./helpers/auth";
import { seedListingForSeller } from "./helpers/marketplace";

jest.setTimeout(60000);

describe("Seller settlement ledger (PostgreSQL, simulated provider)", () => {
  let app: INestApplication;
  let server: Server;
  let database: DataSource;
  let settlement: SellerSettlementService;
  let buyer: TestUser;
  let seller: TestUser;
  let admin: TestUser;
  let order: Order;
  let item: OrderItem;
  let listingId: number;

  const transfers = new Map<string, Stripe.Transfer>();
  const keys = new Map<string, Stripe.Transfer>();
  let loseResponse = false;
  let reversed = false;
  const refunds = new Map<string, Stripe.Refund>();
  const provider = {
    onModuleInit: jest.fn(),
    // Refund methods: the seller ledger must follow a real refund reconciliation.
    listRefunds: jest.fn(async (paymentIntentId: string) =>
      [...refunds.values()].filter(
        (refund) => refund.payment_intent === paymentIntentId,
      ),
    ),
    retrieveRefund: jest.fn(async (id: string) => ({ ...refunds.get(id)! })),
    findRefundForOperation: jest.fn(
      async (paymentIntentId: string, operationId: string) =>
        [...refunds.values()].find(
          (refund) =>
            refund.payment_intent === paymentIntentId &&
            refund.metadata?.operationId === operationId,
        ),
    ),
    createRefund: jest.fn(
      async (
        paymentIntentId: string,
        amount: number,
        _reason: string,
        _key: string,
        operationId: string,
      ) => {
        const refund = {
          id: `re_${operationId}`,
          object: "refund",
          payment_intent: paymentIntentId,
          amount,
          currency: "eur",
          metadata: { operationId },
          status: "succeeded",
        } as unknown as Stripe.Refund;
        refunds.set(refund.id, refund);
        return { ...refund };
      },
    ),
    listTransfers: jest.fn(async (destination: string) =>
      [...transfers.values()].filter(
        (transfer) => transfer.destination === destination,
      ),
    ),
    retrieveTransfer: jest.fn(async (id: string) => {
      const transfer = transfers.get(id);
      if (!transfer) throw new Error("Provider transfer not found");
      return { ...transfer };
    }),
    findTransferForPayout: jest.fn(
      async (destination: string, payoutId: string) =>
        [...transfers.values()].find(
          (transfer) =>
            transfer.destination === destination &&
            transfer.metadata?.payoutId === payoutId,
        ),
    ),
    createTransfer: jest.fn(
      async (
        destination: string,
        amount: number,
        currency: string,
        idempotencyKey: string,
        payoutId: string,
      ) => {
        let transfer = keys.get(idempotencyKey);
        if (!transfer) {
          transfer = {
            id: `tr_${idempotencyKey}_${transfers.size}`,
            object: "transfer",
            destination,
            amount,
            currency: currency.toLowerCase(),
            metadata: { payoutId },
            reversed,
          } as unknown as Stripe.Transfer;
          keys.set(idempotencyKey, transfer);
          transfers.set(transfer.id, transfer);
        }
        if (loseResponse) {
          loseResponse = false;
          throw new Error("Connection lost after provider commit");
        }
        return { ...transfer };
      },
    ),
  };

  const auth = (user: TestUser) => ({
    Authorization: `Bearer ${user.accessToken}`,
  });
  const summary = async () =>
    (
      await request(server)
        .get("/marketplace/seller/settlement/summary")
        .set(auth(seller))
        .expect(200)
    ).body;
  const requestPayout = (amount: number, requestKey?: string) =>
    request(server)
      .post("/marketplace/seller/settlement/payouts")
      .set(auth(seller))
      .send({ amount, ...(requestKey ? { requestKey } : {}) });
  const processPayout = (
    payoutId: number,
    action: string,
    extra: Record<string, string> = {},
  ) =>
    request(server)
      .post(`/marketplace/admin/payouts/${payoutId}/process`)
      .set(auth(admin))
      .send({ action, ...extra });
  const reconcile = async () =>
    (
      await request(server)
        .get("/marketplace/admin/settlements/reconcile")
        .set(auth(admin))
        .expect(200)
    ).body;
  const ledgerOf = async (): Promise<SellerLedgerEntry[]> => {
    const account = await database
      .getRepository(SellerSettlementAccount)
      .findOneOrFail({ where: { seller: { id: seller.id } } });
    return database
      .getRepository(SellerLedgerEntry)
      .find({ where: { account: { id: account.id } } });
  };

  /** Confirms delivery of the seeded item, which releases the seller's escrow. */
  const deliver = async () => {
    await database
      .getRepository(OrderItem)
      .update(
        { id: item.id },
        { fulfillmentStatus: FulfillmentStatus.DELIVERED },
      );
    const delivered = await database.getRepository(OrderItem).findOneOrFail({
      where: { id: item.id },
      relations: ["order", "seller"],
    });
    await settlement.onItemDelivered(delivered);
  };

  beforeAll(async () => {
    ({ app } = await createE2eApp({
      providerOverrides: [{ provide: StripeService, useValue: provider }],
    }));
    server = app.getHttpServer() as Server;
    database = app.get(DataSource);
    settlement = app.get(SellerSettlementService);
    buyer = await createUser(server);
    seller = await createUser(server);
    admin = await createAdminUser(server, app);
    listingId = await seedListingForSeller(app, seller);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    transfers.clear();
    keys.clear();
    refunds.clear();
    jest.clearAllMocks();
    loseResponse = false;
    reversed = false;

    // A fresh account per test keeps each ledger assertion self-contained.
    for (const table of [
      "refund_line",
      "refund_operation",
      "payment_transaction",
      "seller_ledger_entry",
      "seller_payout",
      "seller_allocation",
      "seller_settlement_account",
    ]) {
      await database.query(`DELETE FROM "${table}"`);
    }

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
      fulfillmentStatus: FulfillmentStatus.SHIPPED,
    });
    await database.getRepository(PaymentTransaction).save({
      order,
      method: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.COMPLETED,
      transactionId: `pi_settlement_${order.id}`,
      amount: 105,
      currency: Currency.EUR,
    });
    await settlement.createAllocationsForOrder(order);

    await request(server)
      .patch("/marketplace/seller/settlement/settings")
      .set(auth(seller))
      .send({ accountHolderName: "Seller", iban: "FR7612345678901234567890" })
      .expect(200);
  });

  it("escrows the commissioned net amount and releases it once on delivery", async () => {
    expect((await summary()).balancePending).toBe(100);

    await deliver();
    await deliver();

    const balances = await summary();
    expect(balances.balancePending).toBe(0);
    expect(balances.balanceAvailable).toBe(100);
    expect(await ledgerOf()).toHaveLength(2);
    expect((await reconcile()).consistent).toBe(true);
  });

  it("reserves one payout per request key under concurrent submissions", async () => {
    await deliver();

    const responses = await Promise.all(
      Array.from({ length: 6 }, () => requestPayout(40, "same-key")),
    );

    expect(responses.map((response) => response.status)).toEqual(
      Array(6).fill(201),
    );
    expect(new Set(responses.map((response) => response.body.id)).size).toBe(1);
    expect(await database.getRepository(SellerPayout).count()).toBe(1);
    expect((await summary()).balanceAvailable).toBe(60);
    await requestPayout(41, "same-key").expect(409);
  });

  it("never lets concurrent payouts overdraw the available balance", async () => {
    await deliver();

    const responses = await Promise.all([
      requestPayout(80, "first"),
      requestPayout(80, "second"),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 400,
    ]);
    expect((await summary()).balanceAvailable).toBe(20);
    expect((await reconcile()).consistent).toBe(true);
  });

  it("refuses replayed administrative outcomes instead of inflating the balance", async () => {
    await deliver();
    const payout = (await requestPayout(30).expect(201)).body;

    await processPayout(payout.id, "COMPLETE").expect(409);
    await processPayout(payout.id, "PROCESS").expect(201);
    await processPayout(payout.id, "COMPLETE").expect(400);
    await processPayout(payout.id, "COMPLETE", {
      transactionReference: "SEPA-777",
    }).expect(201);

    // The audited defect: repeating COMPLETE or FAIL after completion.
    await processPayout(payout.id, "FAIL").expect(409);
    await processPayout(payout.id, "FAIL").expect(409);
    await processPayout(payout.id, "COMPLETE", {
      transactionReference: "SEPA-777",
    }).expect(409);

    const balances = await summary();
    expect(balances.balanceAvailable).toBe(70);
    expect(balances.balancePaidOut).toBe(30);
    expect((await reconcile()).consistent).toBe(true);
  });

  it("returns a failed payout to the available balance exactly once", async () => {
    await deliver();
    const payout = (await requestPayout(30).expect(201)).body;

    await processPayout(payout.id, "PROCESS").expect(201);
    await processPayout(payout.id, "FAIL", {
      failureReason: "Bank rejection",
    }).expect(201);
    await processPayout(payout.id, "FAIL").expect(409);

    expect((await summary()).balanceAvailable).toBe(100);
    expect((await reconcile()).consistent).toBe(true);
  });

  it("cancels a requested payout and restores its reservation", async () => {
    await deliver();
    const payout = (await requestPayout(30).expect(201)).body;

    await processPayout(payout.id, "CANCEL").expect(201);
    await processPayout(payout.id, "PROCESS").expect(409);

    expect((await summary()).balanceAvailable).toBe(100);
    const stored = await database
      .getRepository(SellerPayout)
      .findOneByOrFail({ id: payout.id });
    expect(stored.status).toBe(PayoutStatus.CANCELLED);
  });

  it("disburses a connected-account payout from the provider outcome only", async () => {
    await deliver();
    await request(server)
      .patch("/marketplace/seller/settlement/settings")
      .set(auth(seller))
      .send({
        payoutMethod: PayoutMethod.STRIPE_CONNECT,
        providerAccountId: "acct_seller",
      })
      .expect(200);
    const payout = (await requestPayout(30).expect(201)).body;

    await processPayout(payout.id, "COMPLETE", {
      transactionReference: "not-allowed",
    }).expect(409);
    const processed = (await processPayout(payout.id, "PROCESS").expect(201))
      .body;

    expect(processed.status).toBe(PayoutStatus.COMPLETED);
    expect(processed.providerTransferId).toBeTruthy();
    expect(provider.createTransfer).toHaveBeenCalledTimes(1);
    expect((await summary()).balancePaidOut).toBe(30);
    expect((await reconcile()).consistent).toBe(true);
  });

  it("recovers a lost provider response without disbursing twice", async () => {
    await deliver();
    await request(server)
      .patch("/marketplace/seller/settlement/settings")
      .set(auth(seller))
      .send({
        payoutMethod: PayoutMethod.STRIPE_CONNECT,
        providerAccountId: "acct_seller",
      })
      .expect(200);
    const payout = (await requestPayout(30).expect(201)).body;
    loseResponse = true;

    await processPayout(payout.id, "PROCESS").expect(503);
    const pending = await database
      .getRepository(SellerPayout)
      .findOneByOrFail({ id: payout.id });
    expect(pending.status).toBe(PayoutStatus.PROCESSING);
    expect((await summary()).balanceAvailable).toBe(70);

    const resumed = await settlement.executePayout(payout.id);

    expect(resumed.status).toBe(PayoutStatus.COMPLETED);
    expect(transfers.size).toBe(1);
    expect((await summary()).balancePaidOut).toBe(30);
    expect((await reconcile()).consistent).toBe(true);
  });

  it("reverses a payout the provider reversed and keeps the ledger consistent", async () => {
    await deliver();
    await request(server)
      .patch("/marketplace/seller/settlement/settings")
      .set(auth(seller))
      .send({
        payoutMethod: PayoutMethod.STRIPE_CONNECT,
        providerAccountId: "acct_seller",
      })
      .expect(200);
    const payout = (await requestPayout(30).expect(201)).body;
    reversed = true;

    const outcome = (await processPayout(payout.id, "PROCESS").expect(201))
      .body;

    expect(outcome.status).toBe(PayoutStatus.FAILED);
    const balances = await summary();
    expect(balances.balanceAvailable).toBe(100);
    expect(balances.balancePaidOut).toBe(0);
    expect((await reconcile()).consistent).toBe(true);
  });

  it("freezes seller funds while a buyer claim is open and releases them on closure", async () => {
    await deliver();

    const ticket = (
      await request(server)
        .post(`/marketplace/orders/${order.id}/items/${item.id}/claim`)
        .set(auth(buyer))
        .send({
          claimCategory: ClaimCategory.DAMAGED_ITEM,
          subject: "Damaged card",
          message: "The card arrived bent",
        })
        .expect(201)
    ).body;

    let balances = await summary();
    expect(balances.balanceAvailable).toBe(0);
    expect(balances.balanceOnHold).toBe(100);
    await requestPayout(30).expect(400);
    const held = await database
      .getRepository(SellerAllocation)
      .findOneByOrFail({ id: await allocationId() });
    expect(held.status).toBe(SellerAllocationStatus.DISPUTED_HOLD);

    await request(server)
      .patch(`/support/tickets/${ticket.id}/close`)
      .set(auth(admin))
      .expect(200);
    await request(server)
      .patch(`/support/tickets/${ticket.id}/close`)
      .set(auth(admin))
      .expect(200);

    balances = await summary();
    expect(balances.balanceOnHold).toBe(0);
    expect(balances.balanceAvailable).toBe(100);
    expect((await reconcile()).consistent).toBe(true);
  });

  it("debits a refund net of its returned commission and reverses a failed refund", async () => {
    await deliver();

    await settlement.onRefundApplied(order.id, seller.id, "op-e2e", 20, 5);
    await settlement.onRefundApplied(order.id, seller.id, "op-e2e", 20, 5);

    // 20 merchandise less its 5% commission, plus 5 shipping.
    expect((await summary()).balanceAvailable).toBe(76);
    const allocation = await database
      .getRepository(SellerAllocation)
      .findOneByOrFail({ id: await allocationId() });
    expect(Number(allocation.refundedAmount)).toBe(25);
    expect(Number(allocation.commissionReversedAmount)).toBe(1);

    await settlement.onRefundReversed(order.id, seller.id, "op-e2e");
    await settlement.onRefundReversed(order.id, seller.id, "op-e2e");

    expect((await summary()).balanceAvailable).toBe(100);
    expect((await reconcile()).consistent).toBe(true);
  });

  it("debits the seller when a refund succeeds through the refund endpoint", async () => {
    await deliver();

    await request(server)
      .post(`/marketplace/orders/${order.id}/refund`)
      .set(auth(seller))
      .send({
        requestKey: "ledger-refund",
        lines: [
          { orderItemId: item.id, quantity: 1, amount: 50, shippingAmount: 0 },
        ],
      })
      .expect(201);

    // 50 merchandise less its 5% commission returned to the seller.
    expect((await summary()).balanceAvailable).toBe(52.5);
    expect((await reconcile()).consistent).toBe(true);
  });

  it("records an audit entry for every administrative payout decision", async () => {
    await deliver();
    const payout = (await requestPayout(30).expect(201)).body;
    await processPayout(payout.id, "PROCESS").expect(201);
    await processPayout(payout.id, "COMPLETE", {
      transactionReference: "SEPA-1",
    }).expect(201);

    const events = await database.getRepository(AuditEvent).find({
      where: { targetType: "SELLER_PAYOUT", targetId: String(payout.id) },
    });

    expect(events.map((event) => event.action).sort()).toEqual([
      "ADMIN_PAYOUT_COMPLETE",
      "ADMIN_PAYOUT_PROCESS",
      "REQUEST_PAYOUT",
    ]);
  });

  // Declared last: rebuilding the table from the migration leaves the migrated
  // column types in place, which later assertions on this database do not expect.
  it("applies and rolls back its migration on the live database", async () => {
    const migration = new SellerLedgerAndPayoutExecution1788800000000();
    const runner = database.createQueryRunner();
    await runner.connect();
    try {
      await runner.query(
        `INSERT INTO "seller_ledger_entry" ("account_id", "kind", "requestKey")
         SELECT id, 'opening_balance', 'migration-probe' FROM "seller_settlement_account" LIMIT 1`,
      );
      await migration.down(runner);
      const removed = await runner.query(
        `SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_ledger_entry'`,
      );
      expect(removed).toHaveLength(0);

      await migration.up(runner);
      const restored = await runner.query(
        `SELECT "requestKey" FROM "seller_ledger_entry" WHERE "kind" = 'opening_balance'`,
      );
      // The rebuilt ledger adopts the balances the accounts still carry.
      expect(restored.length).toBeGreaterThan(0);
      const columns = await runner.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'seller_payout' AND column_name IN ('requestKey', 'providerTransferId')`,
      );
      expect(columns).toHaveLength(2);
    } finally {
      await runner.release();
    }
  });

  /** Identifier of the seller's allocation for the order under test. */
  async function allocationId(): Promise<number> {
    const allocation = await database
      .getRepository(SellerAllocation)
      .findOneOrFail({
        where: { order: { id: order.id }, seller: { id: seller.id } },
      });
    return allocation.id;
  }
});
