import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, LessThan, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { AuditEvent } from "../audit/entities/audit-event.entity";
import { ProposalStatus } from "../common/enums/match-result-status";
import {
  PayoutStatus,
} from "../common/enums/seller-settlement";
import { SupportTicketStatusType } from "../common/enums/supportTicketType";
import { Listing } from "../marketplace/entities/listing.entity";
import { Order, OrderStatus } from "../marketplace/entities/order.entity";
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
import {
  ExpireStaleOrdersDto,
  OpsMetricsResponseDto,
  QueryAuditLogsDto,
  RetryOutboxEventsDto,
  SettlementReconciliationResponseDto,
} from "./dto/admin-ops.dto";

/**
 * Service orchestrating system operational visibility, telemetry, outbox replay,
 * stale order expiration sweeps, and settlement financial reconciliation.
 */
@Injectable()
export class AdminOpsService {
  private readonly logger = new Logger(AdminOpsService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(OutboxEvent)
    private readonly outboxRepository: Repository<OutboxEvent>,
    @InjectRepository(SellerAllocation)
    private readonly allocationRepository: Repository<SellerAllocation>,
    @InjectRepository(SellerSettlementAccount)
    private readonly sellerAccountRepository: Repository<SellerSettlementAccount>,
    @InjectRepository(SellerPayout)
    private readonly payoutRepository: Repository<SellerPayout>,
    @InjectRepository(SupportTicket)
    private readonly ticketRepository: Repository<SupportTicket>,
    @InjectRepository(MatchResultProposal)
    private readonly proposalRepository: Repository<MatchResultProposal>,
    @InjectRepository(AuditEvent)
    private readonly auditRepository: Repository<AuditEvent>,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Aggregates live operational telemetry across checkout, outbox, settlements,
   * support claims, and tournament match disputes.
   *
   * @returns Telemetry counters and health metrics.
   */
  async getMetrics(): Promise<OpsMetricsResponseDto> {
    const staleCutoff = new Date(Date.now() - 15 * 60 * 1000);

    // 1. Order metrics
    const [pendingCheckouts, stalePendingCheckouts] = await Promise.all([
      this.orderRepository.count({ where: { status: OrderStatus.PENDING } }),
      this.orderRepository.count({
        where: {
          status: OrderStatus.PENDING,
          createdAt: LessThan(staleCutoff),
        },
      }),
    ]);

    // 2. Outbox metrics
    const [pendingEvents, failedEvents, oldestPending] = await Promise.all([
      this.outboxRepository.count({
        where: { status: OutboxEventStatus.PENDING },
      }),
      this.outboxRepository.count({
        where: { status: OutboxEventStatus.FAILED },
      }),
      this.outboxRepository.findOne({
        where: { status: OutboxEventStatus.PENDING },
        order: { createdAt: "ASC" },
      }),
    ]);

    const oldestPendingAgeSeconds = oldestPending
      ? Math.floor((Date.now() - oldestPending.createdAt.getTime()) / 1000)
      : null;

    // 3. Settlement metrics
    const [pendingPayouts, failedPayouts, sellerAccounts] = await Promise.all([
      this.payoutRepository.count({
        where: { status: In([PayoutStatus.REQUESTED, PayoutStatus.PROCESSING]) },
      }),
      this.payoutRepository.count({
        where: { status: PayoutStatus.FAILED },
      }),
      this.sellerAccountRepository.find(),
    ]);

    const totalPendingEscrow = sellerAccounts.reduce(
      (sum, acc) => sum + Number(acc.balancePending || 0),
      0,
    );
    const totalAvailableBalance = sellerAccounts.reduce(
      (sum, acc) => sum + Number(acc.balanceAvailable || 0),
      0,
    );

    // 4. Claims metrics
    const openClaims = await this.ticketRepository.count({
      where: {
        status: SupportTicketStatusType.opened,
      },
    });

    // 5. Tournament match disputes
    const activeDisputes = await this.proposalRepository.count({
      where: {
        status: ProposalStatus.DISPUTED,
      },
    });

    return {
      orders: {
        pendingCheckouts,
        stalePendingCheckouts,
      },
      outbox: {
        pendingEvents,
        failedEvents,
        oldestPendingAgeSeconds,
      },
      settlement: {
        pendingPayouts,
        failedPayouts,
        totalPendingEscrow: Math.round(totalPendingEscrow * 100) / 100,
        totalAvailableBalance: Math.round(totalAvailableBalance * 100) / 100,
      },
      claims: {
        openClaims,
      },
      tournaments: {
        activeDisputes,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Queries paginated audit events with multi-field filtering.
   *
   * @param dto - Query filters and pagination options.
   * @returns Paginated audit records with total count.
   */
  async queryAuditLogs(
    dto: QueryAuditLogsDto,
  ): Promise<{ data: AuditEvent[]; total: number; page: number; limit: number }> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;

    const query = this.auditRepository.createQueryBuilder("audit");

    if (dto.actorId) {
      query.andWhere("audit.actorId = :actorId", { actorId: dto.actorId });
    }
    if (dto.targetType) {
      query.andWhere("audit.targetType = :targetType", {
        targetType: dto.targetType,
      });
    }
    if (dto.targetId) {
      query.andWhere("audit.targetId = :targetId", { targetId: dto.targetId });
    }
    if (dto.correlationId) {
      query.andWhere("audit.correlationId = :correlationId", {
        correlationId: dto.correlationId,
      });
    }
    if (dto.action) {
      query.andWhere("audit.action ILIKE :action", {
        action: `%${dto.action}%`,
      });
    }
    if (dto.from) {
      query.andWhere("audit.createdAt >= :from", { from: dto.from });
    }
    if (dto.to) {
      query.andWhere("audit.createdAt <= :to", { to: dto.to });
    }

    query.orderBy("audit.createdAt", "DESC");
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Retries failed transactional outbox domain events and records an audit trace.
   *
   * @param dto - Options controlling replay batch size.
   * @param actorId - Operator triggering the replay.
   * @returns Summary of retried and reprocessed events.
   */
  async retryFailedOutboxEvents(
    dto: RetryOutboxEventsDto,
    actorId?: number,
  ): Promise<{ retriedCount: number; processed: number; failed: number }> {
    const limit = dto.limit || 50;

    const failedEvents = await this.outboxRepository.find({
      where: { status: OutboxEventStatus.FAILED },
      take: limit,
      order: { createdAt: "ASC" },
    });

    if (failedEvents.length === 0) {
      return { retriedCount: 0, processed: 0, failed: 0 };
    }

    for (const event of failedEvents) {
      event.status = OutboxEventStatus.PENDING;
      event.retryCount = 0;
      event.lastError = null;
    }
    await this.outboxRepository.save(failedEvents);

    const { processed, failed } =
      await this.outboxService.processPendingEvents(limit);

    await this.auditService.record({
      actorId,
      actorRole: "admin",
      targetType: "outbox",
      targetId: "batch_replay",
      action: "outbox_events_retried",
      reason: `Operator replayed ${failedEvents.length} failed outbox events`,
      afterState: { retriedCount: failedEvents.length, processed, failed },
    });

    return {
      retriedCount: failedEvents.length,
      processed,
      failed,
    };
  }

  /**
   * Sweeps and expires unfinalized checkout orders older than threshold,
   * restoring reserved listing inventory and writing audit events.
   *
   * @param dto - Sweep threshold parameters.
   * @param actorId - Operator executing the sweep.
   * @returns Count of expired orders and restored inventory lines.
   */
  async expireStalePendingOrders(
    dto: ExpireStaleOrdersDto,
    actorId?: number,
  ): Promise<{ expiredCount: number; restoredReservationsCount: number }> {
    const thresholdMinutes = dto.olderThanMinutes || 15;
    const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const staleOrders = await this.orderRepository.find({
      where: {
        status: OrderStatus.PENDING,
        stockReleased: false,
        createdAt: LessThan(cutoff),
      },
      relations: ["orderItems", "orderItems.listing"],
    });

    let restoredReservationsCount = 0;

    await this.dataSource.transaction(async (manager) => {
      for (const order of staleOrders) {
        order.status = OrderStatus.CANCELLED;
        order.stockReleased = true;
        await manager.save(order);

        // Restore listing reservations
        if (order.orderItems) {
          for (const item of order.orderItems) {
            const listingId = item.listing?.id;
            if (listingId) {
              const listing = await manager.findOne(Listing, {
                where: { id: listingId },
                lock: { mode: "pessimistic_write" },
              });
              if (listing) {
                listing.quantityAvailable += item.quantity;
                await manager.save(listing);
                restoredReservationsCount++;
              }
            }
          }
        }

        await this.auditService.record(
          {
            actorId,
            actorRole: "system_ops",
            targetType: "order",
            targetId: String(order.id),
            action: "stale_order_expired",
            reason: `Order unpaid for >${thresholdMinutes}m expired during operational sweep`,
            beforeState: { status: OrderStatus.PENDING },
            afterState: { status: OrderStatus.CANCELLED, stockReleased: true },
          },
          manager,
        );
      }
    });

    return {
      expiredCount: staleOrders.length,
      restoredReservationsCount,
    };
  }

  /**
   * Reconciles marketplace allocations against seller account balances and disbursed payouts.
   *
   * @returns Detailed financial reconciliation report.
   */
  async reconcileSettlement(): Promise<SettlementReconciliationResponseDto> {
    const [allocations, sellerAccounts, completedPayouts] = await Promise.all([
      this.allocationRepository.find(),
      this.sellerAccountRepository.find(),
      this.payoutRepository.find({
        where: { status: PayoutStatus.COMPLETED },
      }),
    ]);

    const totalAllocationsGross = allocations.reduce(
      (sum, a) => sum + Number(a.grossAmount || 0),
      0,
    );
    const totalAllocationsFees = allocations.reduce(
      (sum, a) => sum + Number(a.commissionAmount || 0),
      0,
    );
    const totalAllocationsNet = allocations.reduce(
      (sum, a) => sum + Number(a.netAmount || 0),
      0,
    );

    const totalSellerBalancesPending = sellerAccounts.reduce(
      (sum, a) => sum + Number(a.balancePending || 0),
      0,
    );
    const totalSellerBalancesAvailable = sellerAccounts.reduce(
      (sum, a) => sum + Number(a.balanceAvailable || 0),
      0,
    );
    const totalSellerBalancesOnHold = sellerAccounts.reduce(
      (sum, a) => sum + Number(a.balanceOnHold || 0),
      0,
    );
    const totalSellerBalancesPaidOut = sellerAccounts.reduce(
      (sum, a) => sum + Number(a.balancePaidOut || 0),
      0,
    );

    const totalPayoutsDisbursed = completedPayouts.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );

    const discrepancy = Math.abs(
      totalSellerBalancesPaidOut - totalPayoutsDisbursed,
    );
    const isReconciled = discrepancy < 0.01;

    return {
      totalAllocationsGross: Math.round(totalAllocationsGross * 100) / 100,
      totalAllocationsFees: Math.round(totalAllocationsFees * 100) / 100,
      totalAllocationsNet: Math.round(totalAllocationsNet * 100) / 100,
      totalSellerBalancesPending:
        Math.round(totalSellerBalancesPending * 100) / 100,
      totalSellerBalancesAvailable:
        Math.round(totalSellerBalancesAvailable * 100) / 100,
      totalSellerBalancesOnHold:
        Math.round(totalSellerBalancesOnHold * 100) / 100,
      totalSellerBalancesPaidOut:
        Math.round(totalSellerBalancesPaidOut * 100) / 100,
      totalPayoutsDisbursed: Math.round(totalPayoutsDisbursed * 100) / 100,
      isReconciled,
      discrepancyAmount: Math.round(discrepancy * 100) / 100,
      checkedAt: new Date().toISOString(),
    };
  }
}
