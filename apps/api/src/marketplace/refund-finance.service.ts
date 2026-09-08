import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { isUUID } from "class-validator";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { DataSource } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { RefundStatus } from "../common/enums/refund-status";
import { UserRole } from "../common/enums/user";
import { OutboxService } from "../outbox/outbox.service";
import { User } from "../user/entities/user.entity";
import { CreateRefundDto, RefundLineDto } from "./dto/create-refund.dto";
import { Order, OrderStatus } from "./entities/order.entity";
import {
  PaymentStatus,
  PaymentTransaction,
} from "./entities/payment-transaction.entity";
import { RefundLine } from "./entities/refund-line.entity";
import { RefundOperation } from "./entities/refund-operation.entity";
import {
  financeFingerprint,
  moneyCents,
  providerMinorUnits,
} from "./finance/finance.utils";
import { SellerSettlementService } from "./seller-settlement.service";
import { StripeService } from "./stripe.service";

/** Reserves refunds before provider calls and reconciles each provider outcome exactly once. */
@Injectable()
export class RefundFinanceService {
  constructor(
    private readonly database: DataSource,
    private readonly stripe: StripeService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly settlement: SellerSettlementService,
  ) {}

  /** Validates and durably reserves quantities/amounts before contacting the provider. */
  async createRefund(
    orderId: number,
    dto: CreateRefundDto,
    user: User,
  ): Promise<RefundOperation> {
    const lines = dto.lines
      ?.map((line) => ({
        orderItemId: line.orderItemId,
        quantity: line.quantity,
        amount: line.amount,
        shippingAmount: line.shippingAmount ?? 0,
      }))
      .sort((a, b) => a.orderItemId - b.orderItemId);
    const fingerprint = financeFingerprint({
      amount: dto.amount ?? null,
      reason: dto.reason ?? null,
      lines: lines ?? [],
    });
    // Legacy clients get conservative deduplication; a new intentional refund needs a new key.
    const requestKey = dto.requestKey || fingerprint;
    const operation = await this.database.transaction(async (manager) => {
      const locked = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: "pessimistic_write" },
      });
      if (!locked) throw new NotFoundException("Order not found");
      const order = await manager.findOneOrFail(Order, {
        where: { id: orderId },
        relations: [
          "orderItems",
          "orderItems.seller",
          "payments",
          "refundOperations",
          "refundOperations.refundLines",
          "refundOperations.refundLines.orderItem",
        ],
      });
      const staff = [UserRole.ADMIN, UserRole.MODERATOR].includes(user.role);
      if (
        !staff &&
        !order.orderItems.some((item) => item.seller?.id === user.id)
      )
        throw new ForbiddenException("Refund access denied");
      if (!staff && !lines?.length)
        throw new BadRequestException(
          "Sellers must specify their own refund lines",
        );
      for (const line of lines ?? []) {
        const item = order.orderItems.find(
          (item) => item.id === line.orderItemId,
        );
        if (!item)
          throw new BadRequestException(
            "Refund line does not belong to this order",
          );
        if (!staff && item.seller?.id !== user.id)
          throw new ForbiddenException("Refund line belongs to another seller");
      }
      const prior = order.refundOperations?.find(
        (refund) => refund.requestKey === requestKey,
      );
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new ConflictException("Refund request key payload mismatch");
        return prior;
      }
      if (
        ![
          OrderStatus.PAID,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
        ].includes(order.status)
      )
        throw new BadRequestException("Order is not refundable");
      const payments = order.payments.filter(
        (payment) =>
          payment.status === PaymentStatus.COMPLETED && payment.transactionId,
      );
      if (payments.length !== 1)
        throw new ConflictException(
          "Exactly one completed provider payment is required",
        );
      const payment = payments[0];
      if (
        moneyCents(payment.amount) !== moneyCents(order.totalAmount) ||
        (payment.currency ?? order.currency) !== order.currency
      )
        throw new ConflictException(
          "Recorded payment does not match the order",
        );
      const committed = (order.refundOperations ?? []).filter(
        (refund) => refund.status !== RefundStatus.FAILED,
      );
      if (committed.some((refund) => !refund.refundLines?.length))
        throw new ConflictException(
          "Unallocated provider or legacy refund requires review before another refund",
        );
      const usedLines = committed.flatMap((refund) => refund.refundLines);
      const allocations: RefundLineDto[] = lines?.length ? lines : [];
      if (!allocations.length) {
        let amount = moneyCents(dto.amount ?? 0);
        if (amount <= 0)
          throw new BadRequestException("Refund amount must be positive");
        // Staff order-wide amounts are deterministically allocated to remaining line balances.
        for (const item of [...order.orderItems].sort((a, b) => a.id - b.id)) {
          const used = usedLines.filter(
            (line) => line.orderItem.id === item.id,
          );
          const goods = Math.max(
            0,
            moneyCents(item.unitPrice) * item.quantity -
              used.reduce((sum, line) => sum + moneyCents(line.amount), 0),
          );
          const shipping = Math.max(
            0,
            moneyCents(item.shippingCost) -
              used.reduce(
                (sum, line) => sum + moneyCents(line.shippingAmount),
                0,
              ),
          );
          const lineAmount = Math.min(amount, goods);
          amount -= lineAmount;
          const lineShipping = Math.min(amount, shipping);
          amount -= lineShipping;
          if (lineAmount + lineShipping)
            allocations.push({
              orderItemId: item.id,
              quantity: 0,
              amount: lineAmount / 100,
              shippingAmount: lineShipping / 100,
            });
        }
        if (amount)
          throw new BadRequestException(
            "Refund exceeds remaining order balance",
          );
      }
      if (
        new Set(allocations.map((line) => line.orderItemId)).size !==
        allocations.length
      )
        throw new BadRequestException("Duplicate refund lines");
      let amount = 0;
      for (const line of allocations) {
        const item = order.orderItems.find(
          (item) => item.id === line.orderItemId,
        )!;
        const used = usedLines.filter(
          (previous) => previous.orderItem.id === item.id,
        );
        const lineAmount = moneyCents(line.amount);
        const shipping = moneyCents(line.shippingAmount ?? 0);
        providerMinorUnits(line.amount, order.currency);
        providerMinorUnits(line.shippingAmount ?? 0, order.currency);
        if (
          !Number.isSafeInteger(line.quantity) ||
          line.quantity < 0 ||
          line.quantity +
            used.reduce((sum, previous) => sum + previous.quantity, 0) >
            item.quantity ||
          lineAmount < 0 ||
          shipping < 0 ||
          lineAmount +
            used.reduce(
              (sum, previous) => sum + moneyCents(previous.amount),
              0,
            ) >
            moneyCents(item.unitPrice) * item.quantity ||
          shipping +
            used.reduce(
              (sum, previous) => sum + moneyCents(previous.shippingAmount),
              0,
            ) >
            moneyCents(item.shippingCost)
        )
          throw new BadRequestException(
            "Refund exceeds remaining line quantity or amount",
          );
        amount += lineAmount + shipping;
      }
      if (
        amount <= 0 ||
        amount +
          committed.reduce(
            (sum, refund) => sum + moneyCents(refund.amount),
            0,
          ) >
          moneyCents(order.totalAmount)
      )
        throw new BadRequestException("Refund exceeds remaining order balance");
      providerMinorUnits(amount / 100, order.currency);
      const operation = await manager.save(
        RefundOperation,
        manager.create(RefundOperation, {
          id: randomUUID(),
          order,
          amount: amount / 100,
          currency: order.currency,
          status: RefundStatus.PENDING,
          requestKey,
          fingerprint,
          paymentIntentId: payment.transactionId,
          reason: dto.reason ?? null,
          createdBy: user,
        }),
      );
      for (const line of allocations)
        await manager.save(
          RefundLine,
          manager.create(RefundLine, {
            refundOperation: operation,
            orderItem: { id: line.orderItemId },
            quantity: line.quantity,
            amount: line.amount,
            shippingAmount: line.shippingAmount ?? 0,
          }),
        );
      await this.audit.record(
        {
          actorId: user.id,
          actorRole: user.role,
          targetType: "order",
          targetId: String(orderId),
          action: "refund.reserved",
          afterState: { operationId: operation.id, amount: operation.amount },
        },
        manager,
      );
      return operation;
    });
    return this.executeRefund(operation.id);
  }

  /** Resumes the same provider request after a lost response without freeing its reservation. */
  async executeRefund(operationId: string): Promise<RefundOperation> {
    const operation = await this.database.transaction(async (manager) => {
      const op = await manager.findOneOrFail(RefundOperation, {
        where: { id: operationId },
        lock: { mode: "pessimistic_write" },
      });
      if (op.status !== RefundStatus.PENDING) return op;
      op.providerAttemptedAt ??= new Date();
      await manager.save(RefundOperation, op);
      return op;
    });
    if (operation.status !== RefundStatus.PENDING) return operation;
    if (!operation.paymentIntentId)
      throw new ConflictException(
        "Provider payment identity missing; reconciliation required",
      );
    try {
      let remote = operation.providerRefundId
        ? await this.stripe.retrieveRefund(operation.providerRefundId)
        : await this.stripe.findRefundForOperation(
            operation.paymentIntentId,
            operation.id,
          );
      if (!remote) {
        if (
          Date.now() - operation.providerAttemptedAt!.getTime() >
          23 * 3600000
        )
          throw new ConflictException(
            "Provider idempotency window elapsed; reconcile before retrying",
          );
        remote = await this.stripe.createRefund(
          operation.paymentIntentId,
          providerMinorUnits(operation.amount, operation.currency),
          "requested_by_customer",
          `refund-${operation.id}`,
          operation.id,
        );
      }
      return await this.applyProviderRefund(operation.paymentIntentId, remote);
    } catch (error) {
      await this.database.getRepository(RefundOperation).update(
        { id: operationId, status: RefundStatus.PENDING },
        {
          failureReason:
            error instanceof Error
              ? error.message
              : "Provider outcome unresolved",
        },
      );
      if (error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException(
        "Refund outcome pending; retry with the same request key",
      );
    }
  }

  /** Reconciles individual records, not cumulative charge event amounts or event delivery order. */
  async reconcilePaymentRefunds(paymentIntentId: string): Promise<void> {
    const refunds = await this.stripe.listRefunds(paymentIntentId);
    for (const refund of refunds)
      await this.applyProviderRefund(paymentIntentId, refund);
  }

  /** Groups an operation's allocated lines by the seller whose funds they affect. */
  private sellerAmounts(
    operation: RefundOperation,
  ): Map<number, { goods: number; shipping: number }> {
    const amounts = new Map<number, { goods: number; shipping: number }>();
    for (const line of operation.refundLines ?? []) {
      const sellerId = line.orderItem?.seller?.id;
      if (!sellerId) continue;
      const current = amounts.get(sellerId) ?? { goods: 0, shipping: 0 };
      amounts.set(sellerId, {
        goods: (moneyCents(current.goods) + moneyCents(line.amount)) / 100,
        shipping:
          (moneyCents(current.shipping) + moneyCents(line.shippingAmount)) /
          100,
      });
    }
    return amounts;
  }

  private async applyProviderRefund(
    paymentIntentId: string,
    remote: Stripe.Refund,
  ): Promise<RefundOperation> {
    const payment = await this.database
      .getRepository(PaymentTransaction)
      .findOne({
        where: { transactionId: paymentIntentId },
        relations: ["order"],
      });
    if (!payment) throw new NotFoundException("Payment not recorded yet");
    return this.database.transaction(async (manager) => {
      await manager.findOneOrFail(Order, {
        where: { id: payment.order.id },
        lock: { mode: "pessimistic_write" },
      });
      // Read under the same order lock as reconciliation so delayed responses cannot overwrite newer outcomes.
      remote = await this.stripe.retrieveRefund(remote.id);
      const remoteIntent =
        typeof remote.payment_intent === "string"
          ? remote.payment_intent
          : remote.payment_intent?.id;
      if (
        remoteIntent !== paymentIntentId ||
        remote.currency.toUpperCase() !==
          (payment.currency ?? payment.order.currency).toUpperCase() ||
        !Number.isSafeInteger(remote.amount) ||
        remote.amount <= 0
      )
        throw new ConflictException("Provider refund payment mismatch");
      const order = await manager.findOneOrFail(Order, {
        where: { id: payment.order.id },
        relations: ["buyer", "orderItems", "orderItems.seller"],
      });
      let operation = await manager.findOne(RefundOperation, {
        where: { order: { id: order.id }, providerRefundId: remote.id },
        relations: [
          "refundLines",
          "refundLines.orderItem",
          "refundLines.orderItem.seller",
        ],
      });
      if (
        !operation &&
        remote.metadata?.operationId &&
        isUUID(remote.metadata.operationId)
      )
        operation = await manager.findOne(RefundOperation, {
          where: { id: remote.metadata.operationId, order: { id: order.id } },
          relations: [
            "refundLines",
            "refundLines.orderItem",
            "refundLines.orderItem.seller",
          ],
        });
      if (!operation) {
        operation = manager.create(RefundOperation, {
          order,
          amount:
            remote.amount / (remote.currency.toUpperCase() === "JPY" ? 1 : 100),
          currency: order.currency,
          paymentIntentId,
          status: RefundStatus.PENDING,
          providerRefundId: remote.id,
          reason: "Unallocated provider refund; operator review required",
        });
      }
      if (
        providerMinorUnits(operation.amount, operation.currency) !==
          remote.amount ||
        (operation.providerRefundId && operation.providerRefundId !== remote.id)
      )
        throw new ConflictException(
          "Provider refund does not match reserved operation",
        );
      const previousStatus = operation.status;
      const alreadyLinked =
        operation.providerRefundId === remote.id && !!operation.id;
      const nextStatus =
        remote.status === "succeeded"
          ? RefundStatus.SUCCEEDED
          : ["failed", "canceled"].includes(remote.status ?? "")
            ? RefundStatus.FAILED
            : RefundStatus.PENDING;
      if (alreadyLinked && previousStatus === nextStatus) return operation;
      if (
        previousStatus === RefundStatus.SUCCEEDED &&
        nextStatus === RefundStatus.PENDING
      )
        return operation;
      if (
        previousStatus === RefundStatus.FAILED &&
        nextStatus === RefundStatus.PENDING
      )
        return operation;
      operation.providerRefundId = remote.id;
      operation.status = nextStatus;
      operation.failureReason = remote.failure_reason ?? null;
      await manager.save(RefundOperation, operation);
      const refunds = await manager.find(RefundOperation, {
        where: { order: { id: order.id } },
        order: { createdAt: "DESC" },
      });
      const successfulAmount = refunds
        .filter((refund) => refund.status === RefundStatus.SUCCEEDED)
        .reduce((sum, refund) => sum + moneyCents(refund.amount), 0);
      if (successfulAmount >= moneyCents(order.totalAmount)) {
        if (
          ![OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(order.status)
        ) {
          operation.orderStatusBeforeFullRefund = order.status;
          await manager.save(RefundOperation, operation);
          order.status = OrderStatus.REFUNDED;
          await manager.save(Order, order);
        }
        await manager.update(
          PaymentTransaction,
          { id: payment.id },
          { status: PaymentStatus.REFUNDED },
        );
      } else if (
        nextStatus === RefundStatus.FAILED &&
        previousStatus === RefundStatus.SUCCEEDED
      ) {
        if (order.status === OrderStatus.REFUNDED) {
          const restoredStatus = refunds.find(
            (refund) => refund.orderStatusBeforeFullRefund,
          )?.orderStatusBeforeFullRefund;
          if (!restoredStatus)
            throw new ConflictException(
              "Legacy full refund reversal requires order-state review",
            );
          order.status = restoredStatus;
          await manager.save(Order, order);
        }
        await manager.update(
          PaymentTransaction,
          { id: payment.id },
          { status: PaymentStatus.COMPLETED },
        );
      }
      // Settlement follows the provider's confirmed outcome, once per seller.
      for (const [sellerId, amounts] of this.sellerAmounts(operation)) {
        if (nextStatus === RefundStatus.SUCCEEDED) {
          await this.settlement.onRefundApplied(
            order.id,
            sellerId,
            operation.id,
            amounts.goods,
            amounts.shipping,
            manager,
          );
        } else if (
          previousStatus === RefundStatus.SUCCEEDED &&
          nextStatus === RefundStatus.FAILED
        ) {
          await this.settlement.onRefundReversed(
            order.id,
            sellerId,
            operation.id,
            manager,
          );
        }
      }
      if (nextStatus === RefundStatus.SUCCEEDED) {
        await this.outbox.record(
          {
            eventType: "order.refund_created",
            aggregateType: "order",
            aggregateId: String(order.id),
            payload: {
              orderId: order.id,
              buyerUserId: order.buyer.id,
              refundOperationId: operation.id,
              amount: Number(operation.amount),
              currency: operation.currency,
              reason: operation.reason,
            },
          },
          manager,
        );
      }
      await this.audit.record(
        {
          targetType: "order",
          targetId: String(order.id),
          action: "refund.reconciled",
          beforeState: { status: previousStatus },
          afterState: {
            operationId: operation.id,
            status: operation.status,
            providerRefundId: remote.id,
          },
        },
        manager,
      );
      return operation;
    });
  }
}
