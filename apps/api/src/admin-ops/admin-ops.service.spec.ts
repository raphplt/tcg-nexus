import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { AuditEvent } from "../audit/entities/audit-event.entity";
import { PaymentTransaction } from "../marketplace/entities/payment-transaction.entity";
import { OrderService } from "../marketplace/order.service";
import { RefundFinanceService } from "../marketplace/refund-finance.service";
import { SellerSettlementService } from "../marketplace/seller-settlement.service";
import { StripeService } from "../marketplace/stripe.service";
import { PayoutStatus } from "../common/enums/seller-settlement";
import { Listing } from "../marketplace/entities/listing.entity";
import { Order } from "../marketplace/entities/order.entity";
import { SellerAllocation } from "../marketplace/entities/seller-allocation.entity";
import { SellerPayout } from "../marketplace/entities/seller-payout.entity";
import { SellerSettlementAccount } from "../marketplace/entities/seller-settlement-account.entity";
import { MatchResultProposal } from "../match/entities/match-result-proposal.entity";
import {
  OutboxEvent,
  OutboxEventStatus,
} from "../outbox/entities/outbox-event.entity";
import { OutboxService } from "../outbox/outbox.service";
import { SupportTicket } from "../support-ticket/entities/support-ticket.entity";
import { AdminOpsService } from "./admin-ops.service";

describe("AdminOpsService", () => {
  let mockPaymentRepo: any;
  let mockOrderService: any;
  let mockSettlementService: any;
  let mockRefundFinance: any;
  let mockStripeService: any;
  let service: AdminOpsService;

  const mockOrderRepo = {
    count: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockListingRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockOutboxRepo = {
    count: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockAllocationRepo = {
    find: jest.fn(),
  };

  const mockSellerAccountRepo = {
    find: jest.fn(),
  };

  const mockPayoutRepo = {
    count: jest.fn(),
    find: jest.fn(),
  };

  const mockTicketRepo = {
    count: jest.fn(),
  };

  const mockProposalRepo = {
    count: jest.fn(),
  };

  const mockAuditRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockAuditService = {
    record: jest.fn().mockResolvedValue({ id: 1 }),
  };

  const mockOutboxService = {
    processPendingEvents: jest
      .fn()
      .mockResolvedValue({ processed: 2, failed: 0 }),
  };

  const mockManager = {
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb) => cb(mockManager)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPaymentRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (entity) => entity),
      count: jest.fn().mockResolvedValue(0),
    };
    mockOrderService = {
      expireStaleReservations: jest.fn().mockResolvedValue(0),
      reconcileCancelledPayment: jest
        .fn()
        .mockResolvedValue({ cancelled: 0, compensationRequired: 0 }),
    };
    mockSettlementService = {
      reconcile: jest.fn().mockResolvedValue({
        accountsChecked: 1,
        consistent: true,
        discrepancies: [],
      }),
    };
    mockRefundFinance = { reconcilePaymentRefunds: jest.fn() };
    mockStripeService = { createRefund: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminOpsService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(Listing), useValue: mockListingRepo },
        { provide: getRepositoryToken(OutboxEvent), useValue: mockOutboxRepo },
        {
          provide: getRepositoryToken(SellerAllocation),
          useValue: mockAllocationRepo,
        },
        {
          provide: getRepositoryToken(SellerSettlementAccount),
          useValue: mockSellerAccountRepo,
        },
        { provide: getRepositoryToken(SellerPayout), useValue: mockPayoutRepo },
        {
          provide: getRepositoryToken(SupportTicket),
          useValue: mockTicketRepo,
        },
        {
          provide: getRepositoryToken(MatchResultProposal),
          useValue: mockProposalRepo,
        },
        { provide: getRepositoryToken(AuditEvent), useValue: mockAuditRepo },
        {
          provide: getRepositoryToken(PaymentTransaction),
          useValue: mockPaymentRepo,
        },
        { provide: OrderService, useValue: mockOrderService },
        { provide: SellerSettlementService, useValue: mockSettlementService },
        { provide: RefundFinanceService, useValue: mockRefundFinance },
        { provide: StripeService, useValue: mockStripeService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AdminOpsService>(AdminOpsService);
  });

  describe("getMetrics", () => {
    it("should aggregate operational metrics across all subsystems", async () => {
      mockOrderRepo.count
        .mockResolvedValueOnce(5) // pendingCheckouts
        .mockResolvedValueOnce(2); // stalePendingCheckouts

      mockOutboxRepo.count
        .mockResolvedValueOnce(3) // pendingEvents
        .mockResolvedValueOnce(1); // failedEvents
      mockOutboxRepo.findOne.mockResolvedValueOnce({
        createdAt: new Date(Date.now() - 120 * 1000),
      });

      mockPayoutRepo.count
        .mockResolvedValueOnce(4) // pendingPayouts
        .mockResolvedValueOnce(1); // failedPayouts

      mockSellerAccountRepo.find.mockResolvedValueOnce([
        { balancePending: "150.00", balanceAvailable: "320.50" },
        { balancePending: "50.00", balanceAvailable: "80.00" },
      ]);

      mockTicketRepo.count.mockResolvedValueOnce(6); // openClaims
      mockProposalRepo.count.mockResolvedValueOnce(2); // activeDisputes

      const metrics = await service.getMetrics();

      expect(metrics.orders.pendingCheckouts).toBe(5);
      expect(metrics.orders.stalePendingCheckouts).toBe(2);
      expect(metrics.outbox.pendingEvents).toBe(3);
      expect(metrics.outbox.failedEvents).toBe(1);
      expect(metrics.outbox.oldestPendingAgeSeconds).toBeGreaterThanOrEqual(
        119,
      );
      expect(metrics.settlement.pendingPayouts).toBe(4);
      expect(metrics.settlement.failedPayouts).toBe(1);
      expect(metrics.settlement.totalPendingEscrow).toBe(200);
      expect(metrics.settlement.totalAvailableBalance).toBe(400.5);
      expect(metrics.claims.openClaims).toBe(6);
      expect(metrics.tournaments.activeDisputes).toBe(2);
      expect(metrics.timestamp).toBeDefined();
    });
  });

  describe("queryAuditLogs", () => {
    it("should query audit logs with pagination and filters", async () => {
      const qb: any = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
      };
      mockAuditRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.queryAuditLogs({
        actorId: 42,
        targetType: "order",
        targetId: "100",
        page: 1,
        limit: 10,
      });

      expect(qb.andWhere).toHaveBeenCalledWith("audit.actorId = :actorId", {
        actorId: 42,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        "audit.targetType = :targetType",
        {
          targetType: "order",
        },
      );
      expect(qb.andWhere).toHaveBeenCalledWith("audit.targetId = :targetId", {
        targetId: "100",
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe("retryFailedOutboxEvents", () => {
    it("should return early if no failed events exist", async () => {
      mockOutboxRepo.find.mockResolvedValueOnce([]);

      const result = await service.retryFailedOutboxEvents({ limit: 10 }, 1);
      expect(result.retriedCount).toBe(0);
      expect(mockOutboxService.processPendingEvents).not.toHaveBeenCalled();
    });

    it("should reset failed events to pending, trigger processor, and audit", async () => {
      const failedEvents = [
        {
          id: "evt-1",
          status: OutboxEventStatus.FAILED,
          retryCount: 5,
          lastError: "Network timeout",
        },
      ];
      mockOutboxRepo.find.mockResolvedValueOnce(failedEvents);
      mockOutboxRepo.save.mockResolvedValueOnce(failedEvents);

      const result = await service.retryFailedOutboxEvents({ limit: 10 }, 99);

      expect(failedEvents[0].status).toBe(OutboxEventStatus.PENDING);
      expect(failedEvents[0].retryCount).toBe(0);
      expect(failedEvents[0].lastError).toBeNull();
      expect(mockOutboxService.processPendingEvents).toHaveBeenCalledWith(10);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 99,
          action: "outbox_events_retried",
        }),
      );
      expect(result.retriedCount).toBe(1);
      expect(result.processed).toBe(2);
    });
  });

  describe("expireStalePendingOrders", () => {
    it("delegates the sweep to the locked order state machine", async () => {
      mockOrderService.expireStaleReservations.mockResolvedValue(2);

      const result = await service.expireStalePendingOrders(
        { olderThanMinutes: 15 },
        1,
      );

      expect(mockOrderService.expireStaleReservations).toHaveBeenCalledWith(15);
      expect(result.expiredCount).toBe(2);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "stale_orders_expired" }),
      );
    });

    it("records nothing when the sweep finds no candidate", async () => {
      mockOrderService.expireStaleReservations.mockResolvedValue(0);

      const result = await service.expireStalePendingOrders({}, 1);

      expect(result.expiredCount).toBe(0);
      expect(mockAuditService.record).not.toHaveBeenCalled();
    });
  });

  describe("compensatePayment", () => {
    it("refunds a capture owed back exactly once", async () => {
      const payment = {
        id: 7,
        transactionId: "pi_1",
        amount: "50.00",
        compensationRequiredAt: new Date(),
        compensatedAt: null,
        order: { id: 42, buyer: { id: 3 } },
      };
      mockPaymentRepo.findOne.mockResolvedValue(payment);

      const first = await service.compensatePayment(7, 1);
      expect(first.compensated).toBe(true);
      expect(mockStripeService.createRefund).toHaveBeenCalledWith(
        "pi_1",
        undefined,
        "requested_by_customer",
        "late-payment-7",
      );
      expect(mockRefundFinance.reconcilePaymentRefunds).toHaveBeenCalledWith(
        "pi_1",
      );

      const second = await service.compensatePayment(7, 1);
      expect(second.compensated).toBe(false);
      expect(mockStripeService.createRefund).toHaveBeenCalledTimes(1);
    });

    it("refuses a payment that owes nothing", async () => {
      mockPaymentRepo.findOne.mockResolvedValue({
        id: 8,
        transactionId: "pi_2",
        compensationRequiredAt: null,
      });

      await expect(service.compensatePayment(8, 1)).rejects.toThrow();
      expect(mockStripeService.createRefund).not.toHaveBeenCalled();
    });
  });

  describe("reconcileSettlement", () => {
    it("should calculate ledger sums and declare reconciled when balanced", async () => {
      mockAllocationRepo.find.mockResolvedValueOnce([
        { grossAmount: "100.00", commissionAmount: "5.00", netAmount: "95.00" },
        {
          grossAmount: "200.00",
          commissionAmount: "10.00",
          netAmount: "190.00",
        },
      ]);
      mockSellerAccountRepo.find.mockResolvedValueOnce([
        {
          balancePending: "190.00",
          balanceAvailable: "0.00",
          balanceOnHold: "0.00",
          balancePaidOut: "95.00",
        },
      ]);
      mockPayoutRepo.find.mockResolvedValueOnce([
        { amount: "95.00", status: PayoutStatus.COMPLETED },
      ]);

      const report = await service.reconcileSettlement();

      expect(report.totalAllocationsGross).toBe(300);
      expect(report.totalAllocationsFees).toBe(15);
      expect(report.totalAllocationsNet).toBe(285);
      expect(report.totalSellerBalancesPaidOut).toBe(95);
      expect(report.totalPayoutsDisbursed).toBe(95);
      expect(report.isReconciled).toBe(true);
      expect(report.discrepancyAmount).toBe(0);
      expect(report.checkedAt).toBeDefined();
    });
  });
});
