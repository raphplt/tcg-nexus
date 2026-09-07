import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AuditService } from "src/audit/audit.service";
import { InventoryDisposition } from "src/common/enums/inventory-disposition";
import { RefundStatus } from "src/common/enums/refund-status";
import { ReturnStatus } from "src/common/enums/return-status";
import { UserRole } from "src/common/enums/user";
import { OutboxService } from "src/outbox/outbox.service";
import { User } from "src/user/entities/user.entity";
import { DataSource, EntityManager, Repository } from "typeorm";
import { CreateRefundDto } from "./dto/create-refund.dto";
import { CreateReturnDto } from "./dto/create-return.dto";
import { UpdateDispositionDto } from "./dto/update-disposition.dto";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { Listing } from "./entities/listing.entity";

import { OrderItem } from "./entities/order-item.entity";
import { Order, OrderStatus } from "./entities/order.entity";
import {
  PaymentStatus,
  PaymentTransaction,
} from "./entities/payment-transaction.entity";
import { RefundLine } from "./entities/refund-line.entity";
import { RefundOperation } from "./entities/refund-operation.entity";
import { ReturnItem } from "./entities/return-item.entity";
import { StripeService } from "./stripe.service";

/**
 * Service orchestrating partial/full refunds, returns, and inspected inventory dispositions.
 */
@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(RefundOperation)
    private readonly refundOperationRepository: Repository<RefundOperation>,
    @InjectRepository(RefundLine)
    private readonly refundLineRepository: Repository<RefundLine>,
    @InjectRepository(ReturnItem)
    private readonly returnItemRepository: Repository<ReturnItem>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    private readonly stripeService: StripeService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly dataSource: DataSource,
  ) {}

  private isStaff(user: User): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;
  }

  private async authorizeOrderRead(
    orderId: number,
    user: User,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["buyer", "orderItems", "orderItems.seller"],
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (
      !this.isStaff(user) &&
      order.buyer?.id !== user.id &&
      !order.orderItems.some((item) => item.seller?.id === user.id)
    ) {
      throw new ForbiddenException("Order access denied");
    }
    return order;
  }

  /**
   * Returns the buyer/staff order balance or only the requesting seller's line balance.
   *
   * @param orderId - Order identifier.
   * @param user - Authenticated caller whose participation is verified before reading refunds.
   * @throws ForbiddenException If the caller is unrelated to the order.
   */
  async getAuthorizedRefundBalance(
    orderId: number,
    user: User,
  ): Promise<{
    totalAmount: number;
    alreadyRefunded: number;
    remainingAmount: number;
  }> {
    const order = await this.authorizeOrderRead(orderId, user);
    if (this.isStaff(user) || order.buyer.id === user.id)
      return this.calculateRemainingRefundable(orderId);
    const ownItems = order.orderItems.filter(
      (item) => item.seller?.id === user.id,
    );
    const totalAmount =
      Math.round(
        ownItems.reduce(
          (sum, item) =>
            sum +
            Number(item.unitPrice) * item.quantity +
            Number(item.shippingCost),
          0,
        ) * 100,
      ) / 100;
    const refunds = await this.refundOperationRepository.find({
      where: { order: { id: orderId }, status: RefundStatus.SUCCEEDED },
      relations: [
        "refundLines",
        "refundLines.orderItem",
        "refundLines.orderItem.seller",
      ],
    });
    const alreadyRefunded =
      Math.round(
        refunds
          .flatMap((refund) => refund.refundLines ?? [])
          .filter((line) => line.orderItem.seller?.id === user.id)
          .reduce(
            (sum, line) =>
              sum + Number(line.amount) + Number(line.shippingAmount),
            0,
          ) * 100,
      ) / 100;
    // Legacy order-wide refunds cannot safely be attributed to a seller's remaining allowance.
    const hasUnallocatedRefund = refunds.some(
      (refund) => !refund.refundLines?.length,
    );
    return {
      totalAmount,
      alreadyRefunded,
      remainingAmount: hasUnallocatedRefund
        ? 0
        : Math.max(0, Math.round((totalAmount - alreadyRefunded) * 100) / 100),
    };
  }

  /**
   * Calculates the remaining refundable balance on an order.
   *
   * @param orderId - Order identifier.
   * @returns Total amount, total already refunded, and remaining refundable amount.
   * @throws NotFoundException If the order does not exist.
   */
  async calculateRemainingRefundable(orderId: number): Promise<{
    totalAmount: number;
    alreadyRefunded: number;
    remainingAmount: number;
  }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["refundOperations"],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const successfulRefunds = (order.refundOperations ?? []).filter(
      (ref) => ref.status === RefundStatus.SUCCEEDED,
    );

    const alreadyRefunded = successfulRefunds.reduce(
      (sum, ref) => sum + Number(ref.amount),
      0,
    );

    const totalAmount = Number(order.totalAmount);
    const remainingAmount = Math.max(
      0,
      Math.round((totalAmount - alreadyRefunded) * 100) / 100,
    );

    return {
      totalAmount,
      alreadyRefunded: Math.round(alreadyRefunded * 100) / 100,
      remainingAmount,
    };
  }

  /**
   * Initiates a partial or full refund on an order.
   *
   * @param orderId - Order identifier.
   * @param dto - Refund allocations and amount.
   * @param user - Requesting user (must be admin or seller).
   * @returns Persisted RefundOperation entity.
   */
  async createRefund(
    orderId: number,
    dto: CreateRefundDto,
    user: User,
  ): Promise<RefundOperation> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["buyer", "orderItems", "orderItems.seller", "payments"],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;
    const isSeller = order.orderItems.some(
      (item) => item.seller?.id === user.id,
    );

    if (!isAdmin && !isSeller) {
      throw new ForbiddenException(
        "Vous n'avez pas l'autorisation d'émettre un remboursement sur cette commande",
      );
    }

    if (!isAdmin && !dto.lines?.length) {
      throw new BadRequestException(
        "Sellers must specify the order lines to refund",
      );
    }
    for (const line of dto.lines ?? []) {
      const item = order.orderItems.find(
        (item) => item.id === line.orderItemId,
      );
      if (!item)
        throw new BadRequestException(
          "Refund line does not belong to this order",
        );
      if (!isAdmin && item.seller?.id !== user.id) {
        throw new ForbiddenException("Refund line belongs to another seller");
      }
    }

    if (
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.SHIPPED &&
      order.status !== OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        "Seule une commande réglée peut faire l'objet d'un remboursement",
      );
    }

    const { remainingAmount } =
      await this.calculateRemainingRefundable(orderId);

    let refundAmount = dto.amount;
    if (dto.lines && dto.lines.length > 0) {
      const lineTotal = dto.lines.reduce(
        (sum, line) => sum + line.amount + (line.shippingAmount ?? 0),
        0,
      );
      refundAmount = lineTotal;
    }

    if (!refundAmount || refundAmount <= 0) {
      throw new BadRequestException(
        "Le montant du remboursement doit être supérieur à 0",
      );
    }

    if (refundAmount > remainingAmount + 0.001) {
      throw new BadRequestException(
        `Le montant demandé (${refundAmount} €) dépasse le solde remboursable restant (${remainingAmount} €)`,
      );
    }

    // Resolve payment intent ID from payment transactions
    const successfulPayment = order.payments?.find(
      (p) => p.status === PaymentStatus.COMPLETED,
    );
    const paymentIntentId = successfulPayment?.transactionId;

    let providerRefundId: string | null = null;
    if (paymentIntentId) {
      try {
        const idempotencyKey = `ref_${order.id}_${Date.now()}`;
        const stripeRefund = await this.stripeService.createRefund(
          paymentIntentId,
          Math.round(refundAmount * 100),
          "requested_by_customer",
          idempotencyKey,
        );
        providerRefundId = stripeRefund.id;
      } catch (err) {
        this.logger.error(
          `Stripe refund creation failed on order ${order.id}: ${(err as Error).message}`,
        );
        throw new BadRequestException(
          `Échec du remboursement bancaire : ${(err as Error).message}`,
        );
      }
    }

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const refundOp = manager.create(RefundOperation, {
        order,
        amount: refundAmount,
        currency: order.currency,
        reason: dto.reason ?? null,
        status: RefundStatus.SUCCEEDED,
        providerRefundId,
        createdBy: user,
      });

      const savedOp = await manager.save(RefundOperation, refundOp);

      if (dto.lines && dto.lines.length > 0) {
        for (const lineDto of dto.lines) {
          const item = order.orderItems.find(
            (i) => i.id === lineDto.orderItemId,
          );
          if (!item) {
            throw new BadRequestException(
              `L'article ${lineDto.orderItemId} n'appartient pas à la commande ${order.id}`,
            );
          }

          const line = manager.create(RefundLine, {
            refundOperation: savedOp,
            orderItem: item,
            quantity: lineDto.quantity,
            amount: lineDto.amount,
            shippingAmount: lineDto.shippingAmount ?? 0,
          });
          await manager.save(RefundLine, line);
        }
      }

      // Check if full order is now refunded
      const newRemaining = Math.max(
        0,
        Math.round((remainingAmount - refundAmount) * 100) / 100,
      );
      if (newRemaining <= 0) {
        order.status = OrderStatus.REFUNDED;
        await manager.save(Order, order);
      }

      await this.auditService.record(
        {
          actorId: user.id,
          actorRole: user.role ?? "user",
          targetType: "order",
          targetId: String(order.id),
          action: "order.refunded",
          reason: dto.reason ?? "Refund issued",
          beforeState: { remainingAmount },
          afterState: {
            refundedAmount: refundAmount,
            remainingAmount: newRemaining,
            providerRefundId,
          },
        },
        manager,
      );

      await this.outboxService.record(
        {
          eventType: "order.refunded",
          aggregateType: "order",
          aggregateId: String(order.id),
          payload: {
            orderId: order.id,
            refundOperationId: savedOp.id,
            amount: refundAmount,
            currency: order.currency,
            providerRefundId,
          },
        },
        manager,
      );

      return savedOp;
    });
  }

  /**
   * Retrieves all refund operations for an order.
   *
   * @param orderId - Order identifier.
   * @param user - Authenticated buyer, participating seller, or staff member.
   * @returns Refunds with only the seller's own lines when the caller is a seller.
   */
  async findRefundsByOrder(
    orderId: number,
    user: User,
  ): Promise<RefundOperation[]> {
    const order = await this.authorizeOrderRead(orderId, user);
    const refunds = await this.refundOperationRepository.find({
      where: { order: { id: orderId } },
      relations: [
        "refundLines",
        "refundLines.orderItem",
        "refundLines.orderItem.seller",
        "createdBy",
      ],
      order: { createdAt: "DESC" },
    });
    if (this.isStaff(user) || order.buyer.id === user.id) return refunds;
    return refunds.flatMap((refund) => {
      const ownLines = (refund.refundLines ?? []).filter(
        (line) => line.orderItem.seller?.id === user.id,
      );
      if (!ownLines.length) return [];
      const ownAmount =
        Math.round(
          ownLines.reduce(
            (sum, line) =>
              sum + Number(line.amount) + Number(line.shippingAmount),
            0,
          ) * 100,
        ) / 100;
      return [
        {
          ...refund,
          refundLines: ownLines,
          amount: ownAmount,
          reason: null,
          createdBy: null,
          providerRefundId: null,
        },
      ];
    });
  }

  /**
   * Creates a return request for an order item.
   *
   * @param orderItemId - Order item identifier.
   * @param dto - Return quantity and reason.
   * @param buyer - Requesting buyer.
   * @returns Persisted ReturnItem entity.
   */
  async createReturnRequest(
    orderItemId: number,
    dto: CreateReturnDto,
    buyer: User,
  ): Promise<ReturnItem> {
    const orderItem = await this.orderItemRepository.findOne({
      where: { id: orderItemId },
      relations: ["order", "order.buyer", "listing"],
    });

    if (!orderItem) {
      throw new NotFoundException(`Order item ${orderItemId} not found`);
    }

    if (orderItem.order.buyer?.id !== buyer.id) {
      throw new ForbiddenException(
        "Vous ne pouvez demander un retour que pour vos propres achats",
      );
    }

    if (dto.quantity > orderItem.quantity) {
      throw new BadRequestException(
        `La quantité demandée (${dto.quantity}) dépasse la quantité commandée (${orderItem.quantity})`,
      );
    }

    const returnItem = this.returnItemRepository.create({
      orderItem,
      quantity: dto.quantity,
      reason: dto.reason,
      status: ReturnStatus.REQUESTED,
      disposition: InventoryDisposition.NO_RETURN_REQUIRED,
    });

    const saved = await this.returnItemRepository.save(returnItem);

    await this.auditService.record({
      actorId: buyer.id,
      actorRole: buyer.role ?? "buyer",
      targetType: "order_item",
      targetId: String(orderItem.id),
      action: "order.return_requested",
      reason: dto.reason,
      afterState: { returnItemId: saved.id, quantity: dto.quantity },
    });

    await this.outboxService.record({
      eventType: "order.return_requested",
      aggregateType: "order_item",
      aggregateId: String(orderItem.id),
      payload: {
        returnItemId: saved.id,
        orderId: orderItem.order.id,
        orderItemId: orderItem.id,
        quantity: dto.quantity,
        reason: dto.reason,
      },
    });

    return saved;
  }

  /**
   * Sets the physical disposition of a returned item after physical inspection.
   * Restocks inventory ONLY if disposition is RESTOCK.
   *
   * @param returnId - Return identifier.
   * @param dto - Inspected disposition and optional notes.
   * @param user - Seller or admin performing inspection.
   * @returns Updated ReturnItem entity.
   */
  async setReturnDisposition(
    returnId: string,
    dto: UpdateDispositionDto,
    user: User,
  ): Promise<ReturnItem> {
    const returnItem = await this.returnItemRepository.findOne({
      where: { id: returnId },
      relations: [
        "orderItem",
        "orderItem.order",
        "orderItem.listing",
        "orderItem.listing.inventoryItem",
        "orderItem.seller",
      ],
    });

    if (!returnItem) {
      throw new NotFoundException(`Return ${returnId} not found`);
    }

    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;
    const isSeller = returnItem.orderItem.seller?.id === user.id;

    if (!isAdmin && !isSeller) {
      throw new ForbiddenException(
        "Vous n'avez pas l'autorisation de traiter ce retour",
      );
    }

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const previousDisposition = returnItem.disposition;
      returnItem.disposition = dto.disposition;
      returnItem.status = ReturnStatus.RECEIVED;
      returnItem.receivedAt = returnItem.receivedAt || new Date();
      returnItem.disposedAt = new Date();
      if (dto.notes) {
        returnItem.notes = dto.notes;
      }

      // Restock only when transitioning to RESTOCK disposition
      if (
        dto.disposition === InventoryDisposition.RESTOCK &&
        previousDisposition !== InventoryDisposition.RESTOCK &&
        returnItem.orderItem.listing
      ) {
        await manager.increment(
          Listing,
          { id: returnItem.orderItem.listing.id },
          "quantityAvailable",
          returnItem.quantity,
        );

        if (returnItem.orderItem.listing.inventoryItem?.id) {
          const inv = await manager.findOne(CollectionItem, {
            where: { id: returnItem.orderItem.listing.inventoryItem.id },
            lock: { mode: "pessimistic_write" },
          });
          if (inv) {
            inv.quantitySold = Math.max(
              0,
              (inv.quantitySold || 0) - returnItem.quantity,
            );
            inv.quantityAvailable += returnItem.quantity;
            await manager.save(CollectionItem, inv);
          }
        }

        this.logger.log(
          `Restocked ${returnItem.quantity} copies for listing ${returnItem.orderItem.listing.id} from return ${returnItem.id}`,
        );
      }

      const saved = await manager.save(ReturnItem, returnItem);

      await this.auditService.record(
        {
          actorId: user.id,
          actorRole: user.role ?? "seller",
          targetType: "return_item",
          targetId: String(returnItem.id),
          action: "return.disposition_set",
          reason: dto.notes ?? `Disposition set to ${dto.disposition}`,
          beforeState: { disposition: previousDisposition },
          afterState: { disposition: dto.disposition, notes: dto.notes },
        },
        manager,
      );

      await this.outboxService.record(
        {
          eventType: "return.disposition_set",
          aggregateType: "return_item",
          aggregateId: String(returnItem.id),
          payload: {
            returnId: returnItem.id,
            disposition: dto.disposition,
            quantity: returnItem.quantity,
          },
        },
        manager,
      );

      return saved;
    });
  }

  /**
   * Retrieves all returns for order items in a given order.
   *
   * @param orderId - Order identifier.
   * @param user - Authenticated buyer, participating seller, or staff member.
   * @returns Returns scoped to the seller's items when applicable.
   */
  async findReturnsByOrder(orderId: number, user: User): Promise<ReturnItem[]> {
    const order = await this.authorizeOrderRead(orderId, user);
    const sellerOnly = !this.isStaff(user) && order.buyer.id !== user.id;
    return this.returnItemRepository.find({
      where: {
        orderItem: {
          order: { id: orderId },
          ...(sellerOnly ? { seller: { id: user.id } } : {}),
        },
      },
      relations: ["orderItem"],
      order: { createdAt: "DESC" },
    });
  }
}
