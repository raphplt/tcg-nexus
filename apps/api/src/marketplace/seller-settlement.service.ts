import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import Stripe from "stripe";
import { DataSource, EntityManager, Repository } from "typeorm";
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
import { User } from "../user/entities/user.entity";
import {
  AdminProcessPayoutDto,
  RequestPayoutDto,
  SellerSettlementSummaryDto,
  SettlementReconciliationDto,
  UpdatePayoutSettingsDto,
} from "./dto/seller-settlement.dto";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { SellerAllocation } from "./entities/seller-allocation.entity";
import { SellerLedgerEntry } from "./entities/seller-ledger-entry.entity";
import { SellerPayout } from "./entities/seller-payout.entity";
import { SellerSettlementAccount } from "./entities/seller-settlement-account.entity";
import { moneyCents, providerMinorUnits } from "./finance/finance.utils";
import { StripeService } from "./stripe.service";

/** Balance movement expressed in hundredths of the account's major currency unit. */
interface LedgerMovement {
  kind: SellerLedgerEntryKind;
  requestKey: string;
  pending?: number;
  available?: number;
  onHold?: number;
  paidOut?: number;
  allocation?: SellerAllocation | null;
  payout?: SellerPayout | null;
  refundOperationId?: string | null;
  reason?: string | null;
}

/** Payout transitions the administrative and provider paths are allowed to perform. */
const PAYOUT_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  [PayoutStatus.REQUESTED]: [
    PayoutStatus.PROCESSING,
    PayoutStatus.FAILED,
    PayoutStatus.CANCELLED,
  ],
  [PayoutStatus.PROCESSING]: [PayoutStatus.COMPLETED, PayoutStatus.FAILED],
  [PayoutStatus.COMPLETED]: [],
  [PayoutStatus.FAILED]: [],
  [PayoutStatus.CANCELLED]: [],
};

/**
 * Owns seller escrow, order allocations, commissions and disbursements (MKT-06).
 *
 * Every balance change is an append-only ledger entry applied under a row lock on
 * the settlement account, so a replayed administrative action, a concurrent
 * refund and a payout race cannot invent funds. Stored balances remain equal to
 * the sum of their entries, which {@link reconcile} verifies.
 */
@Injectable()
export class SellerSettlementService {
  constructor(
    private readonly database: DataSource,
    @InjectRepository(SellerSettlementAccount)
    private readonly accountRepository: Repository<SellerSettlementAccount>,
    @InjectRepository(SellerAllocation)
    private readonly allocationRepository: Repository<SellerAllocation>,
    @InjectRepository(SellerPayout)
    private readonly payoutRepository: Repository<SellerPayout>,
    @InjectRepository(SellerLedgerEntry)
    private readonly ledgerRepository: Repository<SellerLedgerEntry>,
    private readonly stripe: StripeService,
    private readonly auditService: AuditService,
  ) {}

  /** Runs work inside the caller's transaction, or opens one when called standalone. */
  private run<T>(
    manager: EntityManager | undefined,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return manager
      ? work(manager)
      : this.database.transaction((transaction) => work(transaction));
  }

  /**
   * Applies one movement to a locked account exactly once.
   *
   * @returns The recorded entry, or null when its key was already applied.
   */
  private async applyMovement(
    manager: EntityManager,
    accountId: number,
    movement: LedgerMovement,
  ): Promise<SellerLedgerEntry | null> {
    const account = await manager.findOne(SellerSettlementAccount, {
      where: { id: accountId },
      lock: { mode: "pessimistic_write" },
    });
    if (!account) throw new NotFoundException("Settlement account not found");

    const existing = await manager.findOne(SellerLedgerEntry, {
      where: {
        account: { id: accountId },
        requestKey: movement.requestKey,
      },
    });
    if (existing) return null;

    const entry = await manager.save(
      SellerLedgerEntry,
      manager.create(SellerLedgerEntry, {
        account: { id: accountId } as SellerSettlementAccount,
        currency: account.currency,
        kind: movement.kind,
        deltaPendingCents: movement.pending ?? 0,
        deltaAvailableCents: movement.available ?? 0,
        deltaOnHoldCents: movement.onHold ?? 0,
        deltaPaidOutCents: movement.paidOut ?? 0,
        allocation: movement.allocation ?? null,
        payout: movement.payout ?? null,
        refundOperationId: movement.refundOperationId ?? null,
        requestKey: movement.requestKey,
        reason: movement.reason ?? null,
      }),
    );

    // Balances stay a materialized projection of the entries applied above.
    account.balancePending =
      (moneyCents(account.balancePending) + (movement.pending ?? 0)) / 100;
    account.balanceAvailable =
      (moneyCents(account.balanceAvailable) + (movement.available ?? 0)) / 100;
    account.balanceOnHold =
      (moneyCents(account.balanceOnHold) + (movement.onHold ?? 0)) / 100;
    account.balancePaidOut =
      (moneyCents(account.balancePaidOut) + (movement.paidOut ?? 0)) / 100;
    await manager.save(SellerSettlementAccount, account);

    return entry;
  }

  /** Reports whether a movement key has already been recorded. */
  private async alreadyApplied(
    manager: EntityManager,
    requestKey: string,
  ): Promise<boolean> {
    return (
      (await manager.findOne(SellerLedgerEntry, { where: { requestKey } })) !==
      null
    );
  }

  /** Applies the exact negation of an earlier movement, once. */
  private async reverseMovement(
    manager: EntityManager,
    originalKey: string,
    movement: Pick<LedgerMovement, "kind" | "requestKey" | "reason">,
  ): Promise<SellerLedgerEntry | null> {
    const original = await manager.findOne(SellerLedgerEntry, {
      where: { requestKey: originalKey },
      relations: ["account", "allocation", "payout"],
    });
    if (!original) return null;

    return this.applyMovement(manager, original.account.id, {
      ...movement,
      pending: -original.deltaPendingCents,
      available: -original.deltaAvailableCents,
      onHold: -original.deltaOnHoldCents,
      paidOut: -original.deltaPaidOutCents,
      allocation: original.allocation ?? null,
      payout: original.payout ?? null,
      refundOperationId: original.refundOperationId ?? null,
    });
  }

  /**
   * Retrieves or initializes a settlement account for a seller.
   */
  async getOrCreateAccount(
    sellerId: number,
    currency: Currency = Currency.EUR,
    manager?: EntityManager,
  ): Promise<SellerSettlementAccount> {
    const repo = manager
      ? manager.getRepository(SellerSettlementAccount)
      : this.accountRepository;

    const account = await repo.findOne({
      where: { seller: { id: sellerId }, currency },
      relations: ["seller"],
    });
    if (account) return account;

    const created = repo.create({
      seller: { id: sellerId } as User,
      currency,
      status: SellerAccountStatus.PENDING_ONBOARDING,
      payoutMethod: PayoutMethod.BANK_TRANSFER,
      balancePending: 0,
      balanceAvailable: 0,
      balancePaidOut: 0,
      balanceOnHold: 0,
      minimumPayoutAmount: 10.0,
    });

    try {
      return await repo.save(created);
    } catch (error) {
      // Another concurrent settlement operation created the same unique account.
      const concurrent = await repo.findOne({
        where: { seller: { id: sellerId }, currency },
        relations: ["seller"],
      });
      if (!concurrent) throw error;
      return concurrent;
    }
  }

  /**
   * Updates payout preferences and bank details for a seller.
   */
  async updatePayoutSettings(
    sellerId: number,
    dto: UpdatePayoutSettingsDto,
  ): Promise<SellerSettlementAccount> {
    const account = await this.getOrCreateAccount(sellerId);

    if (dto.payoutMethod) {
      account.payoutMethod = dto.payoutMethod;
    }

    const currentDetails = account.payoutDetails || {};
    const updatedDetails = {
      ...currentDetails,
      accountHolderName:
        dto.accountHolderName ?? currentDetails.accountHolderName,
      bic: dto.bic ?? currentDetails.bic,
      bankName: dto.bankName ?? currentDetails.bankName,
      providerAccountId:
        dto.providerAccountId ?? currentDetails.providerAccountId,
      ibanMasked: dto.iban
        ? `${dto.iban.substring(0, 4)} **** **** ${dto.iban.slice(-4)}`
        : currentDetails.ibanMasked,
    };

    account.payoutDetails = updatedDetails;

    // A provider-executed payout method needs its connected account before use.
    if (
      account.payoutMethod === PayoutMethod.STRIPE_CONNECT &&
      !updatedDetails.providerAccountId
    ) {
      throw new BadRequestException(
        "A connected account identifier is required for provider payouts",
      );
    }

    // Automatically transition to ACTIVE once basic bank details are supplied
    if (
      account.status === SellerAccountStatus.PENDING_ONBOARDING &&
      updatedDetails.accountHolderName &&
      (updatedDetails.ibanMasked || updatedDetails.providerAccountId)
    ) {
      account.status = SellerAccountStatus.ACTIVE;
    }

    return this.accountRepository.save(account);
  }

  /**
   * Creates immutable order allocations for each seller upon payment confirmation.
   *
   * Re-running the payment confirmation of an order reuses its existing
   * allocations and records no second escrow movement.
   */
  async createAllocationsForOrder(
    order: Order,
    manager?: EntityManager,
  ): Promise<SellerAllocation[]> {
    return this.run(manager, async (transaction) => {
      const items = await transaction.find(OrderItem, {
        where: { order: { id: order.id } },
        relations: ["seller", "order"],
      });

      const sellerItemsMap = new Map<number, OrderItem[]>();
      for (const item of items) {
        if (!item.seller?.id) continue;
        const list = sellerItemsMap.get(item.seller.id) || [];
        list.push(item);
        sellerItemsMap.set(item.seller.id, list);
      }

      const createdAllocations: SellerAllocation[] = [];
      const commissionRate = 0.05; // 5% marketplace commission

      for (const [sellerId, sellerItems] of sellerItemsMap.entries()) {
        const existing = await transaction.findOne(SellerAllocation, {
          where: { order: { id: order.id }, seller: { id: sellerId } },
        });
        if (existing) {
          createdAllocations.push(existing);
          continue;
        }

        const grossCents = sellerItems.reduce(
          (sum, item) => sum + moneyCents(item.unitPrice) * item.quantity,
          0,
        );
        const shippingCents = sellerItems.reduce(
          (sum, item) => sum + moneyCents(item.shippingCost || 0),
          0,
        );
        const commissionCents = Math.round(grossCents * commissionRate);
        const netCents = grossCents + shippingCents - commissionCents;

        const allocation = await transaction.save(
          SellerAllocation,
          transaction.create(SellerAllocation, {
            order,
            seller: { id: sellerId } as User,
            currency: order.currency,
            grossAmount: grossCents / 100,
            shippingAmount: shippingCents / 100,
            commissionRate,
            commissionAmount: commissionCents / 100,
            netAmount: netCents / 100,
            refundedAmount: 0,
            commissionReversedAmount: 0,
            status: SellerAllocationStatus.PENDING_DELIVERY,
          }),
        );
        createdAllocations.push(allocation);

        const account = await this.getOrCreateAccount(
          sellerId,
          order.currency,
          transaction,
        );
        await this.applyMovement(transaction, account.id, {
          kind: SellerLedgerEntryKind.ALLOCATION_RESERVED,
          requestKey: `allocation:${allocation.id}:reserved`,
          pending: netCents,
          allocation,
          reason: `Order ${order.id} escrowed pending delivery`,
        });
      }

      return createdAllocations;
    });
  }

  /**
   * Releases a seller's escrow once every one of their items in the order is delivered.
   */
  async onItemDelivered(
    orderItem: OrderItem,
    manager?: EntityManager,
  ): Promise<void> {
    if (!orderItem.seller?.id || !orderItem.order?.id) return;
    const orderId = orderItem.order.id;
    const sellerId = orderItem.seller.id;

    await this.run(manager, async (transaction) => {
      const allocation = await transaction.findOne(SellerAllocation, {
        where: { order: { id: orderId }, seller: { id: sellerId } },
      });
      if (
        !allocation ||
        allocation.status !== SellerAllocationStatus.PENDING_DELIVERY
      ) {
        return;
      }

      const sellerItems = await transaction.find(OrderItem, {
        where: { order: { id: orderId }, seller: { id: sellerId } },
      });
      const allDelivered = sellerItems.every(
        (item) => item.fulfillmentStatus === FulfillmentStatus.DELIVERED,
      );
      if (!allDelivered) return;

      allocation.status = SellerAllocationStatus.AVAILABLE;
      allocation.eligibleAt = new Date();
      await transaction.save(SellerAllocation, allocation);

      const account = await this.getOrCreateAccount(
        sellerId,
        allocation.currency,
        transaction,
      );
      const netCents = moneyCents(allocation.netAmount);
      await this.applyMovement(transaction, account.id, {
        kind: SellerLedgerEntryKind.DELIVERY_RELEASE,
        requestKey: `allocation:${allocation.id}:released`,
        pending: -netCents,
        available: netCents,
        allocation,
        reason: `Order ${orderId} delivered in full`,
      });
    });
  }

  /**
   * Freezes a seller's allocation while a claim is open (MKT-04).
   *
   * @param claimId - Support ticket identity, which makes the hold replay-safe.
   */
  async onClaimOpened(
    orderId: number,
    sellerId: number,
    claimId: number,
    manager?: EntityManager,
  ): Promise<void> {
    await this.run(manager, async (transaction) => {
      const allocation = await transaction.findOne(SellerAllocation, {
        where: { order: { id: orderId }, seller: { id: sellerId } },
      });
      if (
        !allocation ||
        allocation.status === SellerAllocationStatus.DISPUTED_HOLD ||
        allocation.status === SellerAllocationStatus.CANCELLED
      ) {
        return;
      }

      const previousStatus = allocation.status;
      allocation.status = SellerAllocationStatus.DISPUTED_HOLD;
      await transaction.save(SellerAllocation, allocation);

      const account = await this.getOrCreateAccount(
        sellerId,
        allocation.currency,
        transaction,
      );
      const netCents = moneyCents(allocation.netAmount);
      const fromAvailable = previousStatus === SellerAllocationStatus.AVAILABLE;
      await this.applyMovement(transaction, account.id, {
        kind: SellerLedgerEntryKind.DISPUTE_HOLD,
        requestKey: `claim:${claimId}:hold`,
        pending: fromAvailable ? 0 : -netCents,
        available: fromAvailable ? -netCents : 0,
        onHold: netCents,
        allocation,
        reason: `Claim ${claimId} opened on order ${orderId}`,
      });
    });
  }

  /**
   * Returns a held allocation to the bucket it was frozen from when a claim closes.
   */
  async onClaimResolved(
    claimId: number,
    manager?: EntityManager,
  ): Promise<void> {
    await this.run(manager, async (transaction) => {
      if (await this.alreadyApplied(transaction, `claim:${claimId}:released`))
        return;

      const hold = await transaction.findOne(SellerLedgerEntry, {
        where: { requestKey: `claim:${claimId}:hold` },
        relations: ["account", "allocation"],
      });
      if (!hold?.allocation) return;

      const allocation = await transaction.findOne(SellerAllocation, {
        where: { id: hold.allocation.id },
      });
      if (
        !allocation ||
        allocation.status !== SellerAllocationStatus.DISPUTED_HOLD
      ) {
        return;
      }

      // A refund may have emptied the allocation while the claim was open.
      allocation.status =
        moneyCents(allocation.netAmount) === 0
          ? SellerAllocationStatus.CANCELLED
          : hold.deltaAvailableCents < 0
            ? SellerAllocationStatus.AVAILABLE
            : SellerAllocationStatus.PENDING_DELIVERY;
      await transaction.save(SellerAllocation, allocation);

      await this.reverseMovement(transaction, `claim:${claimId}:hold`, {
        kind: SellerLedgerEntryKind.DISPUTE_RELEASE,
        requestKey: `claim:${claimId}:released`,
        reason: `Claim ${claimId} resolved`,
      });
    });
  }

  /**
   * Debits a seller for a succeeded refund and returns its commission share.
   *
   * @param goodsAmount - Refunded merchandise value in major units.
   * @param shippingAmount - Refunded shipping value in major units.
   */
  async onRefundApplied(
    orderId: number,
    sellerId: number,
    refundOperationId: string,
    goodsAmount: number,
    shippingAmount = 0,
    manager?: EntityManager,
  ): Promise<void> {
    await this.run(manager, async (transaction) => {
      const requestKey = `refund:${refundOperationId}:seller:${sellerId}`;
      if (await this.alreadyApplied(transaction, requestKey)) return;

      const allocation = await transaction.findOne(SellerAllocation, {
        where: { order: { id: orderId }, seller: { id: sellerId } },
      });
      if (!allocation) return;

      const goodsCents = moneyCents(goodsAmount);
      const shippingCents = moneyCents(shippingAmount);
      if (goodsCents + shippingCents <= 0) return;

      const commissionCents = Math.round(
        goodsCents * Number(allocation.commissionRate),
      );
      const debitCents = goodsCents + shippingCents - commissionCents;
      const bucket = allocation.status;

      allocation.refundedAmount =
        (moneyCents(allocation.refundedAmount) + goodsCents + shippingCents) /
        100;
      allocation.commissionReversedAmount =
        (moneyCents(allocation.commissionReversedAmount) + commissionCents) /
        100;
      allocation.netAmount =
        Math.max(0, moneyCents(allocation.netAmount) - debitCents) / 100;
      if (
        moneyCents(allocation.netAmount) === 0 &&
        bucket !== SellerAllocationStatus.DISPUTED_HOLD
      ) {
        allocation.status = SellerAllocationStatus.CANCELLED;
      }
      await transaction.save(SellerAllocation, allocation);

      const account = await this.getOrCreateAccount(
        sellerId,
        allocation.currency,
        transaction,
      );
      await this.applyMovement(transaction, account.id, {
        kind: SellerLedgerEntryKind.REFUND_ADJUSTMENT,
        requestKey,
        pending:
          bucket === SellerAllocationStatus.PENDING_DELIVERY ? -debitCents : 0,
        available:
          bucket === SellerAllocationStatus.AVAILABLE ? -debitCents : 0,
        onHold:
          bucket === SellerAllocationStatus.DISPUTED_HOLD ? -debitCents : 0,
        allocation,
        refundOperationId,
        reason: `Refund ${refundOperationId} on order ${orderId}`,
      });
    });
  }

  /**
   * Restores a seller debit when a previously succeeded refund is confirmed failed.
   */
  async onRefundReversed(
    orderId: number,
    sellerId: number,
    refundOperationId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.run(manager, async (transaction) => {
      const reversalKey = `refund:${refundOperationId}:seller:${sellerId}:reversed`;
      if (await this.alreadyApplied(transaction, reversalKey)) return;

      const adjustment = await transaction.findOne(SellerLedgerEntry, {
        where: { requestKey: `refund:${refundOperationId}:seller:${sellerId}` },
        relations: ["account", "allocation"],
      });
      if (!adjustment?.allocation) return;

      const allocation = await transaction.findOne(SellerAllocation, {
        where: { id: adjustment.allocation.id },
      });
      if (allocation) {
        const restoredCents = -(
          adjustment.deltaPendingCents +
          adjustment.deltaAvailableCents +
          adjustment.deltaOnHoldCents
        );
        allocation.netAmount =
          (moneyCents(allocation.netAmount) + restoredCents) / 100;
        if (allocation.status === SellerAllocationStatus.CANCELLED) {
          allocation.status = allocation.eligibleAt
            ? SellerAllocationStatus.AVAILABLE
            : SellerAllocationStatus.PENDING_DELIVERY;
        }
        await transaction.save(SellerAllocation, allocation);
      }

      await this.reverseMovement(
        transaction,
        `refund:${refundOperationId}:seller:${sellerId}`,
        {
          kind: SellerLedgerEntryKind.REFUND_REVERSAL,
          requestKey: reversalKey,
          reason: `Refund ${refundOperationId} failed after settlement on order ${orderId}`,
        },
      );
    });
  }

  /**
   * Reserves a seller's available balance for a payout request.
   *
   * The reservation, the payout record and its audit entry commit together, so a
   * crash cannot debit a balance without leaving the matching payout.
   */
  async requestPayout(
    seller: User,
    dto: RequestPayoutDto,
  ): Promise<SellerPayout> {
    const currency = dto.currency || Currency.EUR;

    return this.database.transaction(async (manager) => {
      const existingAccount = await this.getOrCreateAccount(
        seller.id,
        currency,
        manager,
      );
      // Validation must read the balance the lock protects, not the row loaded
      // before it: a concurrent request would otherwise pass on stale funds.
      const account = await manager.findOneOrFail(SellerSettlementAccount, {
        where: { id: existingAccount.id },
        lock: { mode: "pessimistic_write" },
      });

      if (dto.requestKey) {
        const prior = await manager.findOne(SellerPayout, {
          where: { seller: { id: seller.id }, requestKey: dto.requestKey },
          relations: ["seller", "account"],
        });
        if (prior) {
          if (
            moneyCents(prior.amount) !== moneyCents(dto.amount) ||
            prior.currency !== currency
          ) {
            throw new ConflictException("Payout request key payload mismatch");
          }
          return prior;
        }
      }

      if (account.status !== SellerAccountStatus.ACTIVE) {
        throw new ForbiddenException(
          `Payouts require an active settlement account (current status: ${account.status})`,
        );
      }

      const amountCents = moneyCents(dto.amount);
      if (amountCents <= 0) {
        throw new BadRequestException("Payout amount must be positive");
      }
      if (amountCents < moneyCents(account.minimumPayoutAmount)) {
        throw new BadRequestException(
          `Minimum payout amount is ${account.minimumPayoutAmount} ${currency}`,
        );
      }
      const available = moneyCents(account.balanceAvailable);
      if (amountCents > available) {
        throw new BadRequestException(
          `Insufficient available balance (${(available / 100).toFixed(2)} ${currency}); requested ${dto.amount.toFixed(2)} ${currency}`,
        );
      }

      const payout = await manager.save(
        SellerPayout,
        manager.create(SellerPayout, {
          seller,
          account,
          currency,
          amount: amountCents / 100,
          status: PayoutStatus.REQUESTED,
          reference: `PAYOUT-${account.id}-${Date.now()}`,
          requestKey: dto.requestKey ?? null,
          payoutMethod: account.payoutMethod,
          payoutDestinationSnapshot: account.payoutDetails || null,
          providerAccountId: account.payoutDetails?.providerAccountId ?? null,
        }),
      );

      await this.applyMovement(manager, account.id, {
        kind: SellerLedgerEntryKind.PAYOUT_RESERVED,
        requestKey: `payout:${payout.id}:reserved`,
        available: -amountCents,
        payout,
        reason: `Payout ${payout.reference} requested`,
      });

      await this.auditService.record(
        {
          actorId: seller.id,
          actorRole: seller.role,
          targetType: "SELLER_PAYOUT",
          targetId: String(payout.id),
          action: "REQUEST_PAYOUT",
          reason: `Seller requested payout of ${dto.amount} ${currency}`,
          afterState: {
            payoutId: payout.id,
            reference: payout.reference,
            amount: Number(payout.amount),
          },
        },
        manager,
      );

      return payout;
    });
  }

  /**
   * Advances a payout through its legal transitions as an administrator.
   *
   * Provider-executed payouts are completed by {@link executePayout} from the
   * provider's own outcome; an administrator cannot declare them paid.
   */
  async adminProcessPayout(
    payoutId: number,
    admin: User,
    dto: AdminProcessPayoutDto,
  ): Promise<SellerPayout> {
    const { payout, execute } = await this.database.transaction(
      async (manager) => {
        const locked = await manager.findOne(SellerPayout, {
          where: { id: payoutId },
          lock: { mode: "pessimistic_write" },
        });
        if (!locked) throw new NotFoundException("Payout request not found");

        const payout = await manager.findOneOrFail(SellerPayout, {
          where: { id: payoutId },
          relations: ["seller", "account"],
        });
        const account =
          payout.account ??
          (await this.getOrCreateAccount(
            payout.seller.id,
            payout.currency,
            manager,
          ));

        const target =
          dto.action === "PROCESS"
            ? PayoutStatus.PROCESSING
            : dto.action === "COMPLETE"
              ? PayoutStatus.COMPLETED
              : dto.action === "CANCEL"
                ? PayoutStatus.CANCELLED
                : PayoutStatus.FAILED;
        if (!PAYOUT_TRANSITIONS[payout.status].includes(target)) {
          throw new ConflictException(
            `Payout ${payout.id} cannot move from ${payout.status} to ${target}`,
          );
        }

        const providerExecuted =
          payout.payoutMethod === PayoutMethod.STRIPE_CONNECT;
        if (providerExecuted && target === PayoutStatus.COMPLETED) {
          throw new ConflictException(
            "Provider-executed payouts complete through provider reconciliation",
          );
        }
        if (!providerExecuted && target === PayoutStatus.COMPLETED) {
          if (!dto.transactionReference) {
            throw new BadRequestException(
              "A disbursement reference is required to complete a manual payout",
            );
          }
          payout.transactionReference = dto.transactionReference;
        }

        const previousStatus = payout.status;
        payout.status = target;
        if (target === PayoutStatus.PROCESSING) {
          payout.processedAt = new Date();
          payout.providerAccountId =
            payout.providerAccountId ??
            account.payoutDetails?.providerAccountId ??
            null;
        }
        if (target === PayoutStatus.COMPLETED) {
          payout.completedAt = new Date();
          await this.applyMovement(manager, account.id, {
            kind: SellerLedgerEntryKind.PAYOUT_PAID,
            requestKey: `payout:${payout.id}:paid`,
            paidOut: moneyCents(payout.amount),
            payout,
            reason: `Payout ${payout.reference} disbursed (${dto.transactionReference})`,
          });
        }
        if (
          target === PayoutStatus.FAILED ||
          target === PayoutStatus.CANCELLED
        ) {
          payout.failureReason =
            dto.failureReason ??
            (target === PayoutStatus.CANCELLED
              ? "Cancelled before disbursement"
              : "Disbursement rejected");
          await this.reverseMovement(manager, `payout:${payout.id}:reserved`, {
            kind: SellerLedgerEntryKind.PAYOUT_REVERSED,
            requestKey: `payout:${payout.id}:reversed`,
            reason: payout.failureReason,
          });
        }
        await manager.save(SellerPayout, payout);

        await this.auditService.record(
          {
            actorId: admin.id,
            actorRole: admin.role,
            targetType: "SELLER_PAYOUT",
            targetId: String(payout.id),
            action: `ADMIN_PAYOUT_${dto.action}`,
            reason: dto.failureReason,
            beforeState: { status: previousStatus },
            afterState: {
              status: payout.status,
              transactionReference: dto.transactionReference,
            },
          },
          manager,
        );

        return {
          payout,
          execute: providerExecuted && target === PayoutStatus.PROCESSING,
        };
      },
    );

    return execute ? this.executePayout(payout.id) : payout;
  }

  /**
   * Disburses a processing payout through the provider, or resumes an ambiguous attempt.
   *
   * The reservation is never released by a failed lookup: an unresolved attempt
   * stays PROCESSING so it can be recovered instead of paid twice.
   */
  async executePayout(payoutId: number): Promise<SellerPayout> {
    const payout = await this.database.transaction(async (manager) => {
      const current = await manager.findOneOrFail(SellerPayout, {
        where: { id: payoutId },
        lock: { mode: "pessimistic_write" },
      });
      if (current.status !== PayoutStatus.PROCESSING) return current;
      current.providerAttemptedAt ??= new Date();
      await manager.save(SellerPayout, current);
      return current;
    });
    if (payout.status !== PayoutStatus.PROCESSING) return payout;
    if (!payout.providerAccountId) {
      throw new ConflictException(
        "Connected account missing; complete seller onboarding before disbursement",
      );
    }

    try {
      let transfer = payout.providerTransferId
        ? await this.stripe.retrieveTransfer(payout.providerTransferId)
        : await this.stripe.findTransferForPayout(
            payout.providerAccountId,
            String(payout.id),
          );
      if (!transfer) {
        if (Date.now() - payout.providerAttemptedAt!.getTime() > 23 * 3600000) {
          throw new ConflictException(
            "Provider idempotency window elapsed; reconcile before retrying",
          );
        }
        transfer = await this.stripe.createTransfer(
          payout.providerAccountId,
          providerMinorUnits(payout.amount, payout.currency),
          payout.currency,
          `payout-${payout.id}`,
          String(payout.id),
        );
      }
      return await this.applyProviderTransfer(payout.id, transfer);
    } catch (error) {
      await this.payoutRepository.update(
        { id: payoutId, status: PayoutStatus.PROCESSING },
        {
          failureReason:
            error instanceof Error
              ? error.message
              : "Provider outcome unresolved",
        },
      );
      if (error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException(
        "Payout outcome pending; retry the same payout",
      );
    }
  }

  /** Records the provider's authoritative outcome for a payout exactly once. */
  private async applyProviderTransfer(
    payoutId: number,
    transfer: Stripe.Transfer,
  ): Promise<SellerPayout> {
    return this.database.transaction(async (manager) => {
      await manager.findOneOrFail(SellerPayout, {
        where: { id: payoutId },
        lock: { mode: "pessimistic_write" },
      });
      const payout = await manager.findOneOrFail(SellerPayout, {
        where: { id: payoutId },
        relations: ["seller"],
      });
      const account = await this.getOrCreateAccount(
        payout.seller.id,
        payout.currency,
        manager,
      );
      // A concurrent administrative decision may already have closed this payout.
      if (payout.status === PayoutStatus.COMPLETED) return payout;
      if (payout.status !== PayoutStatus.PROCESSING) {
        throw new ConflictException(
          `Provider outcome arrived after the payout was ${payout.status}; reconcile manually`,
        );
      }

      const destination =
        typeof transfer.destination === "string"
          ? transfer.destination
          : transfer.destination?.id;
      if (
        destination !== payout.providerAccountId ||
        transfer.currency.toUpperCase() !== payout.currency.toUpperCase() ||
        transfer.amount !== providerMinorUnits(payout.amount, payout.currency)
      ) {
        throw new ConflictException(
          "Provider transfer does not match the reserved payout",
        );
      }

      payout.providerTransferId = transfer.id;
      if (transfer.reversed) {
        payout.status = PayoutStatus.FAILED;
        payout.failureReason = "Provider reversed the disbursement";
        await this.reverseMovement(manager, `payout:${payout.id}:reserved`, {
          kind: SellerLedgerEntryKind.PAYOUT_REVERSED,
          requestKey: `payout:${payout.id}:reversed`,
          reason: payout.failureReason,
        });
      } else {
        payout.status = PayoutStatus.COMPLETED;
        payout.completedAt = payout.completedAt ?? new Date();
        payout.failureReason = null;
        payout.transactionReference = transfer.id;
        await this.applyMovement(manager, account.id, {
          kind: SellerLedgerEntryKind.PAYOUT_PAID,
          requestKey: `payout:${payout.id}:paid`,
          paidOut: moneyCents(payout.amount),
          payout,
          reason: `Provider transfer ${transfer.id}`,
        });
      }
      await manager.save(SellerPayout, payout);

      await this.auditService.record(
        {
          targetType: "SELLER_PAYOUT",
          targetId: String(payout.id),
          action: "PAYOUT_PROVIDER_RECONCILED",
          afterState: {
            status: payout.status,
            providerTransferId: transfer.id,
          },
        },
        manager,
      );

      return payout;
    });
  }

  /**
   * Returns financial overview and ledger state for a seller.
   */
  async getSellerSummary(
    sellerId: number,
    currency: Currency = Currency.EUR,
  ): Promise<SellerSettlementSummaryDto> {
    const account = await this.getOrCreateAccount(sellerId, currency);

    return {
      sellerId,
      currency: account.currency,
      status: account.status,
      payoutMethod: account.payoutMethod,
      balancePending: Number(account.balancePending),
      balanceAvailable: Number(account.balanceAvailable),
      balancePaidOut: Number(account.balancePaidOut),
      balanceOnHold: Number(account.balanceOnHold),
      minimumPayoutAmount: Number(account.minimumPayoutAmount),
      payoutDetails: account.payoutDetails,
    };
  }

  /**
   * Lists order allocations for a seller with order context.
   */
  async getSellerAllocations(sellerId: number): Promise<SellerAllocation[]> {
    return this.allocationRepository.find({
      where: { seller: { id: sellerId } },
      relations: ["order"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Lists payout history for a seller.
   */
  async getSellerPayouts(sellerId: number): Promise<SellerPayout[]> {
    return this.payoutRepository.find({
      where: { seller: { id: sellerId } },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Lists the balance movements of a seller's account, newest first.
   */
  async getSellerLedger(
    sellerId: number,
    currency: Currency = Currency.EUR,
  ): Promise<SellerLedgerEntry[]> {
    const account = await this.getOrCreateAccount(sellerId, currency);
    return this.ledgerRepository.find({
      where: { account: { id: account.id } },
      relations: ["allocation", "payout"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Global settlement overview across all sellers for administrative monitoring.
   */
  async getAdminSettlementOverview(): Promise<{
    totalPending: number;
    totalAvailable: number;
    totalPaidOut: number;
    totalOnHold: number;
    pendingPayoutsCount: number;
  }> {
    const accounts = await this.accountRepository.find();
    const pendingPayoutsCount = await this.payoutRepository.count({
      where: { status: PayoutStatus.REQUESTED },
    });

    return {
      totalPending: accounts.reduce((s, a) => s + Number(a.balancePending), 0),
      totalAvailable: accounts.reduce(
        (s, a) => s + Number(a.balanceAvailable),
        0,
      ),
      totalPaidOut: accounts.reduce((s, a) => s + Number(a.balancePaidOut), 0),
      totalOnHold: accounts.reduce((s, a) => s + Number(a.balanceOnHold), 0),
      pendingPayoutsCount,
    };
  }

  /**
   * Verifies that every stored balance equals the sum of its ledger entries and
   * that disbursed funds match completed payouts, per account and currency.
   */
  async reconcile(): Promise<SettlementReconciliationDto> {
    const accounts = await this.accountRepository.find({
      relations: ["seller"],
    });
    const discrepancies: SettlementReconciliationDto["discrepancies"] = [];

    for (const account of accounts) {
      const entries = await this.ledgerRepository.find({
        where: { account: { id: account.id } },
      });
      const sum = (pick: (entry: SellerLedgerEntry) => number) =>
        entries.reduce((total, entry) => total + pick(entry), 0);
      const completed = await this.payoutRepository.find({
        where: {
          seller: { id: account.seller.id },
          currency: account.currency,
          status: PayoutStatus.COMPLETED,
        },
      });
      const disbursed = completed.reduce(
        (total, payout) => total + moneyCents(payout.amount),
        0,
      );

      const mismatches: string[] = [];
      const compare = (label: string, stored: number, ledger: number) => {
        if (stored !== ledger) {
          mismatches.push(
            `${label}: stored ${(stored / 100).toFixed(2)} vs ledger ${(ledger / 100).toFixed(2)}`,
          );
        }
      };
      compare(
        "pending",
        moneyCents(account.balancePending),
        sum((entry) => entry.deltaPendingCents),
      );
      compare(
        "available",
        moneyCents(account.balanceAvailable),
        sum((entry) => entry.deltaAvailableCents),
      );
      compare(
        "onHold",
        moneyCents(account.balanceOnHold),
        sum((entry) => entry.deltaOnHoldCents),
      );
      compare(
        "paidOut",
        moneyCents(account.balancePaidOut),
        sum((entry) => entry.deltaPaidOutCents),
      );
      compare(
        "payouts",
        disbursed,
        sum((entry) => entry.deltaPaidOutCents),
      );

      if (mismatches.length) {
        discrepancies.push({
          accountId: account.id,
          sellerId: account.seller.id,
          currency: account.currency,
          mismatches,
        });
      }
    }

    return {
      accountsChecked: accounts.length,
      consistent: discrepancies.length === 0,
      discrepancies,
    };
  }
}
