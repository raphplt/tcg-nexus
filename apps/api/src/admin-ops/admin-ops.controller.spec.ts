import { Test, TestingModule } from "@nestjs/testing";
import { AdminOpsController } from "./admin-ops.controller";
import { AdminOpsService } from "./admin-ops.service";

describe("AdminOpsController", () => {
  let controller: AdminOpsController;

  const mockAdminOpsService = {
    getMetrics: jest.fn().mockResolvedValue({
      orders: { pendingCheckouts: 1, stalePendingCheckouts: 0 },
      outbox: {
        pendingEvents: 0,
        failedEvents: 0,
        oldestPendingAgeSeconds: null,
      },
      settlement: {
        pendingPayouts: 0,
        failedPayouts: 0,
        totalPendingEscrow: 0,
        totalAvailableBalance: 0,
      },
      claims: { openClaims: 0 },
      tournaments: { activeDisputes: 0 },
      timestamp: "2026-09-06T12:00:00Z",
    }),
    queryAuditLogs: jest.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    }),
    retryFailedOutboxEvents: jest.fn().mockResolvedValue({
      retriedCount: 1,
      processed: 1,
      failed: 0,
    }),
    expireStalePendingOrders: jest.fn().mockResolvedValue({
      expiredCount: 2,
      restoredReservationsCount: 2,
    }),
    reconcileSettlement: jest.fn().mockResolvedValue({
      totalAllocationsGross: 100,
      totalAllocationsFees: 5,
      totalAllocationsNet: 95,
      totalSellerBalancesPending: 0,
      totalSellerBalancesAvailable: 0,
      totalSellerBalancesOnHold: 0,
      totalSellerBalancesPaidOut: 95,
      totalPayoutsDisbursed: 95,
      isReconciled: true,
      discrepancyAmount: 0,
      checkedAt: "2026-09-06T12:00:00Z",
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOpsController],
      providers: [{ provide: AdminOpsService, useValue: mockAdminOpsService }],
    }).compile();

    controller = module.get<AdminOpsController>(AdminOpsController);
  });

  it("should return operational metrics", async () => {
    const metrics = await controller.getMetrics();
    expect(metrics.orders.pendingCheckouts).toBe(1);
    expect(mockAdminOpsService.getMetrics).toHaveBeenCalled();
  });

  it("should query audit logs with query parameters", async () => {
    const query = { page: 1, limit: 10, targetType: "order" };
    const logs = await controller.queryAuditLogs(query);
    expect(logs.total).toBe(0);
    expect(mockAdminOpsService.queryAuditLogs).toHaveBeenCalledWith(query);
  });

  it("should retry failed outbox events", async () => {
    const res = await controller.retryFailedOutboxEvents(
      { limit: 25 },
      { user: { id: 7 } },
    );
    expect(res.retriedCount).toBe(1);
    expect(mockAdminOpsService.retryFailedOutboxEvents).toHaveBeenCalledWith(
      { limit: 25 },
      7,
    );
  });

  it("should expire stale pending orders", async () => {
    const res = await controller.expireStalePendingOrders(
      { olderThanMinutes: 30 },
      { user: { id: 8 } },
    );
    expect(res.expiredCount).toBe(2);
    expect(mockAdminOpsService.expireStalePendingOrders).toHaveBeenCalledWith(
      { olderThanMinutes: 30 },
      8,
    );
  });

  it("should reconcile settlement ledger", async () => {
    const res = await controller.reconcileSettlement();
    expect(res.isReconciled).toBe(true);
    expect(mockAdminOpsService.reconcileSettlement).toHaveBeenCalled();
  });
});
