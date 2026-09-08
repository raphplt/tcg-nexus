import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { Currency } from "../common/enums/currency";
import { FulfillmentStatus } from "../common/enums/fulfillment-status";
import {
  PayoutMethod,
  PayoutStatus,
  SellerAccountStatus,
  SellerAllocationStatus,
  SellerLedgerEntryKind,
} from "../common/enums/seller-settlement";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { SellerAllocation } from "./entities/seller-allocation.entity";
import { SellerLedgerEntry } from "./entities/seller-ledger-entry.entity";
import { SellerPayout } from "./entities/seller-payout.entity";
import { SellerSettlementAccount } from "./entities/seller-settlement-account.entity";
import { SellerSettlementService } from "./seller-settlement.service";
import { StripeService } from "./stripe.service";

/** Row shape used by the in-memory manager below. */
type Row = Record<string, unknown> & { id?: number | string };

/**
 * Minimal in-memory EntityManager: the ledger invariants under test are about
 * which rows are written, not about SQL generation, and the PostgreSQL suite
 * covers locking and concurrency against a real database.
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
        return (
          !!current && String((current as Row).id) === String(expected)
        );
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
    const index = rows.findIndex((stored) => String(stored.id) === String(row.id));
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

  async findOneOrFail<T>(
    target: unknown,
    options: { where?: Record<string, unknown> } = {},
  ): Promise<T> {
    const row = await this.findOne<T>(target, options);
    if (!row) throw new Error("Entity not found");
    return row;
  }

  getRepository(target: unknown) {
    return {
      find: (options = {}) => this.find(target, options),
      findOne: (options = {}) => this.findOne(target, options),
      create: (data: Row) => this.create(target, data),
      save: (entity: Row) => this.save(target, entity),
      count: async (options: { where?: Record<string, unknown> } = {}) =>
        (await this.find(target, options)).length,
      update: async (
        criteria: Record<string, unknown>,
        patch: Record<string, unknown>,
      ) => {
        for (const row of await this.find<Row>(target, { where: criteria })) {
          Object.assign(row, patch);
        }
      },
    };
  }
}

describe("SellerSettlementService", () => {
  let service: SellerSettlementService;
  let manager: FakeManager;
  let stripe: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };

  const seller = { id: 10, role: UserRole.USER } as User;
  const admin = { id: 1, role: UserRole.ADMIN } as User;

  const ledger = () => manager.store<SellerLedgerEntry>(SellerLedgerEntry);
  const accounts = () =>
    manager.store<SellerSettlementAccount>(SellerSettlementAccount);
  const account = () => accounts()[0];
  const allocations = () => manager.store<SellerAllocation>(SellerAllocation);

  const seedOrder = async (
    unitPrice = 50,
    quantity = 1,
    shippingCost = 0,
  ): Promise<Order> => {
    const order = await manager.save(Order, {
      id: 42,
      currency: Currency.EUR,
    } as unknown as Order);
    await manager.save(OrderItem, {
      id: 500,
      order,
      seller,
      quantity,
      unitPrice,
      shippingCost,
      fulfillmentStatus: FulfillmentStatus.SHIPPED,
    } as unknown as OrderItem);
    return order;
  };

  const activateAccount = async () => {
    await service.updatePayoutSettings(seller.id, {
      accountHolderName: "Seller",
      iban: "FR7612345678901234567890",
    });
  };

  const deliver = async () => {
    const [item] = manager.store<OrderItem>(OrderItem);
    item.fulfillmentStatus = FulfillmentStatus.DELIVERED;
    await service.onItemDelivered(item);
  };

  beforeEach(async () => {
    manager = new FakeManager();
    stripe = {
      createTransfer: jest.fn(),
      retrieveTransfer: jest.fn(),
      listTransfers: jest.fn(async () => []),
      findTransferForPayout: jest.fn(async () => undefined),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const database = {
      transaction: (work: (manager: FakeManager) => Promise<unknown>) =>
        work(manager),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerSettlementService,
        { provide: DataSource, useValue: database },
        {
          provide: getRepositoryToken(SellerSettlementAccount),
          useValue: manager.getRepository(SellerSettlementAccount),
        },
        {
          provide: getRepositoryToken(SellerAllocation),
          useValue: manager.getRepository(SellerAllocation),
        },
        {
          provide: getRepositoryToken(SellerPayout),
          useValue: manager.getRepository(SellerPayout),
        },
        {
          provide: getRepositoryToken(SellerLedgerEntry),
          useValue: manager.getRepository(SellerLedgerEntry),
        },
        { provide: StripeService, useValue: stripe },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(SellerSettlementService);
  });

  describe("allocations and escrow", () => {
    it("escrows the net amount once, whatever the number of confirmations", async () => {
      const order = await seedOrder(50, 1, 5);

      await service.createAllocationsForOrder(order);
      await service.createAllocationsForOrder(order);

      expect(allocations()).toHaveLength(1);
      expect(Number(allocations()[0].commissionAmount)).toBe(2.5);
      expect(Number(allocations()[0].netAmount)).toBe(52.5);
      expect(Number(account().balancePending)).toBe(52.5);
      expect(
        ledger().filter(
          (entry) => entry.kind === SellerLedgerEntryKind.ALLOCATION_RESERVED,
        ),
      ).toHaveLength(1);
    });

    it("releases escrow only once every item of the seller is delivered", async () => {
      const order = await seedOrder(50, 1, 5);
      await service.createAllocationsForOrder(order);
      const [item] = manager.store<OrderItem>(OrderItem);

      await service.onItemDelivered(item);
      expect(Number(account().balanceAvailable)).toBe(0);

      await deliver();
      await deliver();

      expect(Number(account().balancePending)).toBe(0);
      expect(Number(account().balanceAvailable)).toBe(52.5);
      expect(
        ledger().filter(
          (entry) => entry.kind === SellerLedgerEntryKind.DELIVERY_RELEASE,
        ),
      ).toHaveLength(1);
    });
  });

  describe("claims and refunds", () => {
    it("holds released funds while a claim is open and restores their bucket on resolution", async () => {
      const order = await seedOrder(50, 1, 5);
      await service.createAllocationsForOrder(order);
      await deliver();

      await service.onClaimOpened(order.id, seller.id, 77);
      await service.onClaimOpened(order.id, seller.id, 77);

      expect(Number(account().balanceAvailable)).toBe(0);
      expect(Number(account().balanceOnHold)).toBe(52.5);
      expect(allocations()[0].status).toBe(
        SellerAllocationStatus.DISPUTED_HOLD,
      );

      await service.onClaimResolved(77);
      await service.onClaimResolved(77);

      expect(Number(account().balanceOnHold)).toBe(0);
      expect(Number(account().balanceAvailable)).toBe(52.5);
      expect(allocations()[0].status).toBe(SellerAllocationStatus.AVAILABLE);
    });

    it("debits a refund net of its returned commission and reverses a failed refund", async () => {
      const order = await seedOrder(50, 1, 5);
      await service.createAllocationsForOrder(order);
      await deliver();

      await service.onRefundApplied(order.id, seller.id, "op-1", 20, 5);
      await service.onRefundApplied(order.id, seller.id, "op-1", 20, 5);

      // 20 goods less its 5% commission, plus 5 shipping.
      expect(Number(account().balanceAvailable)).toBe(28.5);
      expect(Number(allocations()[0].refundedAmount)).toBe(25);
      expect(Number(allocations()[0].commissionReversedAmount)).toBe(1);

      await service.onRefundReversed(order.id, seller.id, "op-1");
      await service.onRefundReversed(order.id, seller.id, "op-1");

      expect(Number(account().balanceAvailable)).toBe(52.5);
      expect(Number(allocations()[0].netAmount)).toBe(52.5);
    });

    it("takes a refund from escrow while the order is still pending delivery", async () => {
      const order = await seedOrder(50, 1, 5);
      await service.createAllocationsForOrder(order);

      await service.onRefundApplied(order.id, seller.id, "op-2", 50, 5);

      expect(Number(account().balancePending)).toBe(0);
      expect(Number(account().balanceAvailable)).toBe(0);
      expect(allocations()[0].status).toBe(SellerAllocationStatus.CANCELLED);
    });
  });

  describe("payout lifecycle", () => {
    const fund = async () => {
      const order = await seedOrder(50, 1, 5);
      await service.createAllocationsForOrder(order);
      await deliver();
      await activateAccount();
    };

    it("refuses payouts above the available balance or below the minimum", async () => {
      await fund();

      await expect(service.requestPayout(seller, { amount: 60 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.requestPayout(seller, { amount: 1 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(Number(account().balanceAvailable)).toBe(52.5);
    });

    it("refuses payouts while the account is not active", async () => {
      const order = await seedOrder(50, 1, 5);
      await service.createAllocationsForOrder(order);
      await deliver();

      await expect(
        service.requestPayout(seller, { amount: 30 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("reserves the balance once for a repeated request key and rejects a changed amount", async () => {
      await fund();

      const first = await service.requestPayout(seller, {
        amount: 30,
        requestKey: "payout-key",
      });
      const second = await service.requestPayout(seller, {
        amount: 30,
        requestKey: "payout-key",
      });

      expect(second.id).toBe(first.id);
      expect(Number(account().balanceAvailable)).toBe(22.5);
      await expect(
        service.requestPayout(seller, { amount: 31, requestKey: "payout-key" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("rejects illegal transitions and replayed administrative outcomes", async () => {
      await fund();
      const payout = await service.requestPayout(seller, { amount: 30 });

      await expect(
        service.adminProcessPayout(payout.id, admin, { action: "COMPLETE" }),
      ).rejects.toBeInstanceOf(ConflictException);

      await service.adminProcessPayout(payout.id, admin, { action: "PROCESS" });
      await expect(
        service.adminProcessPayout(payout.id, admin, { action: "COMPLETE" }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await service.adminProcessPayout(payout.id, admin, {
        action: "COMPLETE",
        transactionReference: "SEPA-1",
      });
      expect(Number(account().balancePaidOut)).toBe(30);
      expect(Number(account().balanceAvailable)).toBe(22.5);

      for (const action of ["COMPLETE", "FAIL", "PROCESS"] as const) {
        await expect(
          service.adminProcessPayout(payout.id, admin, {
            action,
            transactionReference: "SEPA-1",
          }),
        ).rejects.toBeInstanceOf(ConflictException);
      }
      expect(Number(account().balancePaidOut)).toBe(30);
      expect(Number(account().balanceAvailable)).toBe(22.5);
    });

    it("returns a failed payout to the available balance exactly once", async () => {
      await fund();
      const payout = await service.requestPayout(seller, { amount: 30 });

      await service.adminProcessPayout(payout.id, admin, { action: "PROCESS" });
      await service.adminProcessPayout(payout.id, admin, {
        action: "FAIL",
        failureReason: "Bank rejection",
      });

      expect(Number(account().balanceAvailable)).toBe(52.5);
      await expect(
        service.adminProcessPayout(payout.id, admin, { action: "FAIL" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(Number(account().balanceAvailable)).toBe(52.5);
    });

    it("completes a connected-account payout from the provider outcome, not an administrator", async () => {
      await fund();
      account().payoutMethod = PayoutMethod.STRIPE_CONNECT;
      account().payoutDetails = {
        ...account().payoutDetails,
        providerAccountId: "acct_1",
      };
      const payout = await service.requestPayout(seller, { amount: 30 });
      stripe.createTransfer.mockResolvedValue({
        id: "tr_1",
        destination: "acct_1",
        currency: "eur",
        amount: 3000,
        reversed: false,
      });

      const processed = await service.adminProcessPayout(payout.id, admin, {
        action: "PROCESS",
      });

      expect(stripe.createTransfer).toHaveBeenCalledWith(
        "acct_1",
        3000,
        Currency.EUR,
        `payout-${payout.id}`,
        String(payout.id),
      );
      expect(processed.status).toBe(PayoutStatus.COMPLETED);
      expect(processed.providerTransferId).toBe("tr_1");
      expect(Number(account().balancePaidOut)).toBe(30);
      await expect(
        service.adminProcessPayout(payout.id, admin, {
          action: "COMPLETE",
          transactionReference: "manual",
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("keeps the reservation when the provider outcome is unresolved", async () => {
      await fund();
      account().payoutMethod = PayoutMethod.STRIPE_CONNECT;
      account().payoutDetails = {
        ...account().payoutDetails,
        providerAccountId: "acct_1",
      };
      const payout = await service.requestPayout(seller, { amount: 30 });
      stripe.createTransfer.mockRejectedValue(new Error("Connection lost"));

      await expect(
        service.adminProcessPayout(payout.id, admin, { action: "PROCESS" }),
      ).rejects.toThrow();

      const stored = manager.store<SellerPayout>(SellerPayout)[0];
      expect(stored.status).toBe(PayoutStatus.PROCESSING);
      expect(stored.providerAttemptedAt).toBeInstanceOf(Date);
      expect(Number(account().balanceAvailable)).toBe(22.5);

      stripe.createTransfer.mockResolvedValue({
        id: "tr_2",
        destination: "acct_1",
        currency: "eur",
        amount: 3000,
        reversed: false,
      });
      const resumed = await service.executePayout(payout.id);
      expect(resumed.status).toBe(PayoutStatus.COMPLETED);
      expect(Number(account().balancePaidOut)).toBe(30);
    });
  });

  describe("reconciliation", () => {
    it("reports an account whose stored balance left its ledger", async () => {
      const order = await seedOrder(50, 1, 5);
      await service.createAllocationsForOrder(order);

      expect((await service.reconcile()).consistent).toBe(true);

      account().balanceAvailable = 999;
      const report = await service.reconcile();

      expect(report.consistent).toBe(false);
      expect(report.discrepancies[0].mismatches[0]).toContain("available");
    });
  });

  describe("payout settings", () => {
    it("activates a pending account once bank details are known", async () => {
      const updated = await service.updatePayoutSettings(seller.id, {
        accountHolderName: "Seller",
        iban: "FR7612345678901234567890",
      });

      expect(updated.status).toBe(SellerAccountStatus.ACTIVE);
      expect(updated.payoutDetails?.ibanMasked).toBe("FR76 **** **** 7890");
    });

    it("requires a connected account before provider payouts are selected", async () => {
      await expect(
        service.updatePayoutSettings(seller.id, {
          accountHolderName: "Seller",
          payoutMethod: PayoutMethod.STRIPE_CONNECT,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
