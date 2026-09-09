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
import { DataSource, EntityManager, Repository, Not } from "typeorm";
import { CreateRefundDto } from "./dto/create-refund.dto";
import { CreateReturnDto } from "./dto/create-return.dto";
import { UpdateDispositionDto } from "./dto/update-disposition.dto";

import { OrderItem } from "./entities/order-item.entity";
import { Order } from "./entities/order.entity";
import { PaymentTransaction } from "./entities/payment-transaction.entity";
import { RefundLine } from "./entities/refund-line.entity";
import { RefundOperation } from "./entities/refund-operation.entity";
import { ReturnItem } from "./entities/return-item.entity";
import { InventoryLedgerService } from "./inventory-ledger.service";
import { RefundFinanceService } from "./refund-finance.service";
import { moneyCents } from "./finance/finance.utils";

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
    private readonly refundFinance: RefundFinanceService,
    private readonly inventoryLedger: InventoryLedgerService,
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
      where: { order: { id: orderId }, status: Not(RefundStatus.FAILED) },
      relations: [
        "refundLines",
        "refundLines.orderItem",
        "refundLines.orderItem.seller",
      ],
    });
    const alreadyRefunded =
      Math.round(
        refunds
          .filter((refund) => refund.status === RefundStatus.SUCCEEDED)
          .flatMap((refund) => refund.refundLines ?? [])
          .filter((line) => line.orderItem.seller?.id === user.id)
          .reduce(
            (sum, line) =>
              sum + Number(line.amount) + Number(line.shippingAmount),
            0,
          ) * 100,
      ) / 100;
    const committedAmount =
      refunds
        .flatMap((refund) => refund.refundLines ?? [])
        .filter((line) => line.orderItem.seller?.id === user.id)
        .reduce(
          (sum, line) =>
            sum + moneyCents(line.amount) + moneyCents(line.shippingAmount),
          0,
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
        : Math.max(0, Math.round((totalAmount - committedAmount) * 100) / 100),
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

    const committedAmount =
      (order.refundOperations ?? [])
        .filter((refund) => refund.status !== RefundStatus.FAILED)
        .reduce((sum, refund) => sum + moneyCents(refund.amount), 0) / 100;
    const totalAmount = Number(order.totalAmount);
    const remainingAmount = Math.max(
      0,
      Math.round((totalAmount - committedAmount) * 100) / 100,
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
    return this.refundFinance.createRefund(orderId, dto, user);
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
          paymentIntentId: null,
          requestKey: null,
          fingerprint: null,
          providerAttemptedAt: null,
          failureReason: null,
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
      relations: ["order", "order.buyer", "listing", "seller"],
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
        sellerUserId: orderItem.seller?.id ?? null,
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
    return this.dataSource.transaction(async (manager: EntityManager) => {
      // The previous disposition is read under the same lock that applies the
      // physical effect, so concurrent inspections cannot both restock.
      const locked = await manager.findOne(ReturnItem, {
        where: { id: returnId },
        lock: { mode: "pessimistic_write" },
      });
      if (!locked) {
        throw new NotFoundException(`Return ${returnId} not found`);
      }
      const returnItem = await manager.findOneOrFail(ReturnItem, {
        where: { id: returnId },
        relations: [
          "orderItem",
          "orderItem.order",
          "orderItem.listing",
          "orderItem.listing.inventoryItem",
          "orderItem.seller",
        ],
      });

      const isAdmin =
        user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;
      const isSeller = returnItem.orderItem.seller?.id === user.id;
      if (!isAdmin && !isSeller) {
        throw new ForbiddenException(
          "Vous n'avez pas l'autorisation de traiter ce retour",
        );
      }

      const previousDisposition = returnItem.disposition;
      if (previousDisposition === dto.disposition) {
        // Re-submitting the same decision changes no stock and adds no movement.
        if (dto.notes && dto.notes !== returnItem.notes) {
          returnItem.notes = dto.notes;
          await manager.save(ReturnItem, returnItem);
        }
        return returnItem;
      }

      const listing = returnItem.orderItem.listing ?? null;
      const wasRestocked = returnItem.restockedQuantity > 0;
      const willRestock = dto.disposition === InventoryDisposition.RESTOCK;
      const revision = returnItem.dispositionRevision + 1;

      if (willRestock && !wasRestocked) {
        await this.inventoryLedger.restockReturn(
          manager,
          returnItem,
          listing,
          returnItem.quantity,
          revision,
        );
        returnItem.restockedQuantity = returnItem.quantity;
      } else if (!willRestock && wasRestocked) {
        // An inspection corrected to a non-sellable outcome removes the copies
        // it had returned to stock instead of leaving them offered twice.
        await this.inventoryLedger.reverseRestock(
          manager,
          returnItem,
          listing,
          returnItem.restockedQuantity,
          revision,
        );
        returnItem.restockedQuantity = 0;
      }

      returnItem.dispositionRevision = revision;
      returnItem.disposition = dto.disposition;
      returnItem.status = ReturnStatus.RECEIVED;
      returnItem.receivedAt = returnItem.receivedAt || new Date();
      returnItem.disposedAt = new Date();
      if (dto.notes) {
        returnItem.notes = dto.notes;
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
          beforeState: {
            disposition: previousDisposition,
            restockedQuantity: wasRestocked ? returnItem.quantity : 0,
          },
          afterState: {
            disposition: dto.disposition,
            restockedQuantity: saved.restockedQuantity,
            revision,
            notes: dto.notes,
          },
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
            restockedQuantity: saved.restockedQuantity,
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
