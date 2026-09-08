import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DataSource,
  EntityManager,
  LessThan,
  MoreThan,
  Repository,
} from "typeorm";
import { Currency } from "../common/enums/currency";
import {
  FULFILLMENT_TRANSITIONS,
  FulfillmentStatus,
} from "../common/enums/fulfillment-status";
import { ProductKind } from "../common/enums/product-kind";
import { UserRole } from "../common/enums/user";
import { PaginatedResult, PaginationHelper } from "../helpers/pagination";
import { DEFAULT_LOCALE } from "../translation/supported-locales";
import { User } from "../user/entities/user.entity";
import { CartItem } from "../user_cart/entities/cart-item.entity";
import { UserCartService } from "../user_cart/user_cart.service";
import { AuditService } from "../audit/audit.service";
import { CollectionItem } from "../collection-item/entities/collection-item.entity";

import { OutboxService } from "../outbox/outbox.service";
import { CardPopularityService } from "./card-popularity.service";
import { AdminOrderQueryDto } from "./dto/admin-order-query.dto";
import { PendingCheckoutSessionDto } from "./dto/pending-checkout-session.dto";
import { StartCheckoutDto } from "./dto/start-checkout.dto";
import { UpdateFulfillmentDto } from "./dto/update-fulfillment.dto";
import { CardEventType } from "./entities/card-event.entity";
import { Listing } from "./entities/listing.entity";
import {
  ORDER_STATUS_TRANSITIONS,
  Order,
  OrderStatus,
} from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import {
  PaymentMethod,
  PaymentStatus,
  PaymentTransaction,
} from "./entities/payment-transaction.entity";
import { SupportTicketStatusType } from "../common/enums/supportTicketType";
import { SupportTicket } from "../support-ticket/entities/support-ticket.entity";
import { CreateClaimDto } from "./dto/create-claim.dto";
import { RefundOperation } from "./entities/refund-operation.entity";
import { RefundStatus } from "../common/enums/refund-status";
import { round2 } from "./price.helper";
import { SHIPPING_POLICY } from "./shipping-policy";
import { RefundFinanceService } from "./refund-finance.service";
import { StripeService } from "./stripe.service";

const RESERVATION_TTL_MINUTES = 20;

const ORDER_RELATIONS = [
  "buyer",
  "orderItems",
  "orderItems.seller",
  "orderItems.listing",
  "orderItems.listing.pokemonCard",
  "orderItems.listing.sealedProduct",
  "payments",
];

export interface CheckoutResult {
  orderId: number;
  clientSecret: string | null;
  amount: number;
  shippingAmount: number;
  currency: Currency;
}

import { SellerSettlementService } from "./seller-settlement.service";
import { Optional } from "@nestjs/common";

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
    @InjectRepository(RefundOperation)
    private readonly refundOperationRepository: Repository<RefundOperation>,
    private readonly stripeService: StripeService,
    private readonly userCartService: UserCartService,
    private readonly cardPopularityService: CardPopularityService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly refundFinance: RefundFinanceService,
    @Optional()
    private readonly sellerSettlementService?: SellerSettlementService,
  ) {}

  async startCheckout(
    dto: StartCheckoutDto,
    user: User,
  ): Promise<CheckoutResult> {
    if (dto.attemptKey) {
      const existingAttempt = await this.orderRepository.findOne({
        where: {
          buyer: { id: user.id },
          checkoutAttemptKey: dto.attemptKey,
        },
        relations: ORDER_RELATIONS,
      });

      if (existingAttempt) {
        if (
          existingAttempt.status === OrderStatus.PENDING &&
          existingAttempt.reservationExpiresAt &&
          new Date(existingAttempt.reservationExpiresAt) > new Date()
        ) {
          const payment = await this.paymentTransactionRepository.findOne({
            where: { order: { id: existingAttempt.id } },
            order: { createdAt: "DESC" },
          });

          let clientSecret: string | null = null;
          if (payment?.transactionId) {
            try {
              const intent = await this.stripeService.retrievePaymentIntent(
                payment.transactionId,
              );
              clientSecret = intent.client_secret;
            } catch {
              // Ignore provider retrieval issues on idempotent replay
            }
          }

          return {
            orderId: existingAttempt.id,
            clientSecret,
            amount: Number(existingAttempt.totalAmount),
            shippingAmount: Number(existingAttempt.shippingAmount),
            currency: existingAttempt.currency,
          };
        }

        if (existingAttempt.status === OrderStatus.PAID) {
          return {
            orderId: existingAttempt.id,
            clientSecret: null,
            amount: Number(existingAttempt.totalAmount),
            shippingAmount: Number(existingAttempt.shippingAmount),
            currency: existingAttempt.currency,
          };
        }
      }
    }

    const cart = await this.userCartService.findCartByUserId(user.id);
    const cartItems = cart?.cartItems ?? [];

    if (cartItems.length === 0) {
      const activePending = await this.findPendingCheckoutSession(user.id);
      if (activePending) {
        return {
          orderId: activePending.orderId,
          clientSecret: activePending.clientSecret,
          amount: activePending.amount,
          shippingAmount: activePending.shippingAmount,
          currency: activePending.currency,
        };
      }
      throw new BadRequestException("Votre panier est vide");
    }

    for (const item of cartItems) {
      if (item.listing.seller && item.listing.seller.id === user.id) {
        throw new BadRequestException(
          "Vous ne pouvez pas acheter votre propre annonce",
        );
      }
    }

    const currencies = [...new Set(cartItems.map((i) => i.listing.currency))];
    if (currencies.length > 1) {
      throw new BadRequestException(
        "Tous les articles du panier doivent être dans la même devise",
      );
    }
    const currency = currencies[0];

    const order = await this.reserveStockAndCreateOrder(
      cartItems,
      currency,
      dto.shippingAddress.trim(),
      user,
      dto.attemptKey,
    );

    try {
      const paymentIntent = await this.stripeService.createPaymentIntent(
        Number(order.totalAmount),
        currency,
        {
          orderId: String(order.id),
          userId: String(user.id),
        },
        // Keyed on the order: a retried checkout reuses the same intent
        // instead of creating a second chargeable one.
        `order-${order.id}`,
      );

      await this.paymentTransactionRepository.save(
        this.paymentTransactionRepository.create({
          order,
          method: PaymentMethod.CREDIT_CARD,
          status: PaymentStatus.INITIATED,
          transactionId: paymentIntent.id,
          amount: Number(order.totalAmount),
          currency,
        }),
      );

      await this.userCartService.clearCart(user.id);

      return {
        orderId: order.id,
        clientSecret: paymentIntent.client_secret,
        amount: Number(order.totalAmount),
        shippingAmount: Number(order.shippingAmount),
        currency,
      };
    } catch (err) {
      await this.cancelOrder(
        order.id,
        `payment intent creation failed: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  private async reserveStockAndCreateOrder(
    cartItems: CartItem[],
    currency: Currency,
    shippingAddress: string,
    user: User,
    attemptKey?: string,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      let itemsAmount = 0;
      const freshListings = new Map<number, Listing>();

      for (const item of cartItems) {
        const freshListing = await manager.findOne(Listing, {
          where: { id: item.listing.id },
          lock: { mode: "pessimistic_write" },
        });

        if (!freshListing) {
          throw new BadRequestException(
            `L'annonce ${item.listing.id} n'est plus disponible`,
          );
        }

        if (
          freshListing.expiresAt &&
          new Date(freshListing.expiresAt) <= new Date()
        ) {
          throw new BadRequestException(
            `"${this.describeItem(item)}" n'est plus en vente`,
          );
        }

        if (freshListing.quantityAvailable < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour "${this.describeItem(item)}" : ${freshListing.quantityAvailable} disponible(s), ${item.quantity} demandé(s)`,
          );
        }

        freshListings.set(item.listing.id, freshListing);
        itemsAmount += Number(freshListing.price) * item.quantity;
      }

      const shippingByCartItem = this.allocateShipping(
        cartItems,
        freshListings,
      );
      const shippingAmount = round2(
        [...shippingByCartItem.values()].reduce((sum, cost) => sum + cost, 0),
      );

      const reservationExpiresAt = new Date(
        Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000,
      );

      const order = manager.create(Order, {
        buyer: user,
        totalAmount: round2(itemsAmount + shippingAmount),
        shippingAmount,
        status: OrderStatus.PENDING,
        currency,
        shippingAddress,
        reservationExpiresAt,
        stockReleased: false,
        checkoutAttemptKey: attemptKey ?? null,
        orderItems: cartItems.map((item) => {
          const listing = freshListings.get(item.listing.id);
          if (!listing) {
            throw new BadRequestException(
              `L'annonce ${item.listing.id} n'est plus disponible`,
            );
          }
          return manager.create(OrderItem, {
            ...this.buildOrderItemSnapshot(item),
            // NOTE: Line amounts must use the same locked price as the order total.
            unitPrice: listing.price,
            shippingCost: shippingByCartItem.get(item.id) ?? 0,
            handlingTimeDays:
              listing.handlingTimeDays ?? SHIPPING_POLICY.handlingTimeDays,
          });
        }),
      });

      const savedOrder = await manager.save(Order, order);

      for (const item of cartItems) {
        await manager.decrement(
          Listing,
          { id: item.listing.id },
          "quantityAvailable",
          item.quantity,
        );
      }

      await this.auditService.record(
        {
          actorId: user.id,
          actorRole: user.role ?? "user",
          targetType: "order",
          targetId: String(savedOrder.id),
          action: "order.checkout_started",
          reason: "Checkout initiated and stock reserved",
          afterState: {
            totalAmount: savedOrder.totalAmount,
            status: savedOrder.status,
            reservationExpiresAt: savedOrder.reservationExpiresAt,
          },
        },
        manager,
      );

      await this.outboxService.record(
        {
          eventType: "order.created",
          aggregateType: "order",
          aggregateId: String(savedOrder.id),
          payload: {
            buyerId: user.id,
            totalAmount: savedOrder.totalAmount,
            currency,
          },
        },
        manager,
      );

      return savedOrder;
    });
  }

  /**
   * Allocates shipping costs per seller. When a seller ships multiple items in a single package,
   * only the single highest shipping cost is charged across all items from that seller.
   */
  private allocateShipping(
    cartItems: CartItem[],
    freshListings: Map<number, Listing>,
  ): Map<number, number> {
    const shippingByCartItem = new Map<number, number>(
      cartItems.map((item) => [item.id, 0]),
    );
    const costliestBySeller = new Map<
      string,
      { itemId: number; cost: number }
    >();

    for (const item of cartItems) {
      const listing = freshListings.get(item.listing.id);
      const cost = Number(listing?.shippingCost ?? 0);
      const sellerKey = item.listing.seller?.id
        ? `seller:${item.listing.seller.id}`
        : `listing:${item.listing.id}`;

      const current = costliestBySeller.get(sellerKey);
      if (!current || cost > current.cost) {
        costliestBySeller.set(sellerKey, { itemId: item.id, cost });
      }
    }

    for (const { itemId, cost } of costliestBySeller.values()) {
      shippingByCartItem.set(itemId, round2(cost));
    }

    return shippingByCartItem;
  }

  private buildOrderItemSnapshot(item: CartItem): Partial<OrderItem> {
    const { listing } = item;
    const isSealed =
      listing.productKind === ProductKind.SEALED || !!listing.sealedProduct;

    const seller = listing.seller ?? null;
    const sellerName = seller
      ? `${seller.firstName ?? ""} ${seller.lastName ?? ""}`.trim()
      : "Vendeur supprimé";

    return {
      listing,
      seller,
      sellerName: sellerName || "Vendeur",
      unitPrice: listing.price,
      quantity: item.quantity,
      productKind: isSealed ? ProductKind.SEALED : ProductKind.CARD,
      productName: this.describeItem(item),
      productImage: isSealed
        ? (listing.sealedProduct?.image ?? null)
        : (listing.pokemonCard?.image ?? null),
      productCondition: isSealed
        ? (listing.sealedCondition ?? null)
        : (listing.cardState ?? null),
      productLanguage: listing.language ?? null,
      productSetName: isSealed
        ? (listing.sealedProduct?.pokemonSet?.name ?? null)
        : (listing.pokemonCard?.set?.name ?? null),
      listingPhotoUrls: listing.photoUrls ?? null,
      listingDefects: listing.defects ?? null,
      fulfillmentStatus: FulfillmentStatus.TO_SHIP,
    };
  }

  /**
   * Label used in checkout error messages. Sealed products carry no name of
   * their own: it is read from the loaded translations, preferring the default
   * locale.
   */
  private describeItem(item: CartItem): string {
    const { listing } = item;
    const locales = listing.sealedProduct?.locales ?? [];
    const sealedName =
      locales.find((locale) => locale.locale === DEFAULT_LOCALE)?.name ??
      locales[0]?.name;

    return listing.pokemonCard?.name ?? sealedName ?? "Produit inconnu";
  }

  /**
   * Retrieves active pending checkout session for the authenticated buyer, if any.
   *
   * @param userId - Buyer user identifier.
   * @returns Active pending checkout session details or null.
   */
  async findPendingCheckoutSession(
    userId: number,
  ): Promise<PendingCheckoutSessionDto | null> {
    const pendingOrder = await this.orderRepository.findOne({
      where: {
        buyer: { id: userId },
        status: OrderStatus.PENDING,
        reservationExpiresAt: MoreThan(new Date()),
      },
      relations: ORDER_RELATIONS,
      order: { createdAt: "DESC" },
    });

    if (!pendingOrder) {
      return null;
    }

    const payment = await this.paymentTransactionRepository.findOne({
      where: { order: { id: pendingOrder.id } },
      order: { createdAt: "DESC" },
    });

    let clientSecret: string | null = null;
    if (payment?.transactionId) {
      try {
        const intent = await this.stripeService.retrievePaymentIntent(
          payment.transactionId,
        );
        clientSecret = intent.client_secret;
      } catch (err) {
        this.logger.warn(
          `Could not retrieve Stripe intent for pending order ${pendingOrder.id}: ${(err as Error).message}`,
        );
      }
    }

    return {
      orderId: pendingOrder.id,
      clientSecret,
      amount: Number(pendingOrder.totalAmount),
      shippingAmount: Number(pendingOrder.shippingAmount),
      currency: pendingOrder.currency,
      shippingAddress: pendingOrder.shippingAddress,
      reservationExpiresAt: pendingOrder.reservationExpiresAt,
      items: (pendingOrder.orderItems ?? []).map((item) => ({
        id: item.id,
        productName: item.productName,
        productImage: item.productImage,
        productCondition: item.productCondition,
        productSetName: item.productSetName,
        productKind: item.productKind,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
    };
  }

  /**
   * Cancels an in-progress pending order by the buyer, releasing stock reservation immediately.
   *
   * @param orderId - Order identifier.
   * @param user - Authenticated user attempting cancellation.
   * @returns Cancellation confirmation.
   * @throws NotFoundException If the order does not exist.
   * @throws ForbiddenException If the order does not belong to the user and user is not admin.
   * @throws BadRequestException If the order is not in PENDING status.
   */
  async cancelPendingOrderByBuyer(
    orderId: number,
    user: User,
  ): Promise<{ success: boolean; orderId: number }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ORDER_RELATIONS,
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const isOwner = order.buyer?.id === user.id;
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à annuler cette commande",
      );
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        "Seule une commande en attente de paiement peut être annulée",
      );
    }

    await this.dataSource.transaction(async (manager) => {
      order.status = OrderStatus.CANCELLED;
      order.reservationExpiresAt = null;
      await this.releaseStock(order, manager);
      await manager.save(Order, order);

      await this.auditService.record(
        {
          actorId: user.id,
          actorRole: user.role ?? "user",
          targetType: "order",
          targetId: String(order.id),
          action: "order.cancelled",
          reason: "Cancelled by buyer before payment",
          beforeState: { status: OrderStatus.PENDING },
          afterState: { status: OrderStatus.CANCELLED, stockReleased: true },
        },
        manager,
      );

      await this.outboxService.record(
        {
          eventType: "order.cancelled",
          aggregateType: "order",
          aggregateId: String(order.id),
          payload: { orderId: order.id, buyerId: user.id },
        },
        manager,
      );
    });

    return { success: true, orderId: order.id };
  }

  async confirmOrderPayment(orderId: number, user: User): Promise<Order> {
    const order = await this.findOrderById(orderId, user.id);

    const payment = await this.paymentTransactionRepository.findOne({
      where: { order: { id: order.id } },
      order: { createdAt: "DESC" },
    });

    if (!payment?.transactionId) {
      throw new BadRequestException(
        "Aucun paiement n'est rattaché à cette commande",
      );
    }

    if (order.status !== OrderStatus.PENDING) {
      return order;
    }

    const paymentIntent = await this.stripeService.retrievePaymentIntent(
      payment.transactionId,
    );

    if (paymentIntent.status !== "succeeded") {
      throw new BadRequestException(
        `Le paiement n'est pas abouti (statut : ${paymentIntent.status})`,
      );
    }

    await this.markOrderPaid(payment.transactionId, {
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });

    return this.findOrderById(orderId, user.id);
  }

  /**
   * Marks an order as paid, exactly once.
   *
   * The Stripe webhook and the client-side confirmation both call this, and
   * can race. The payment row is locked for the whole transaction so the
   * "already processed" check and the status write are atomic; side effects
   * are emitted only by the transaction that actually flipped the status.
   *
   * @param paymentIntentId Stripe PaymentIntent identifier.
   * @param intent Amount, currency and metadata reported by Stripe.
   */
  private async markOrderPaid(
    paymentIntentId: string,
    intent: {
      amount: number;
      currency: string;
      metadata?: Record<string, string> | null;
    },
  ): Promise<void> {
    const paidOrder = await this.dataSource.transaction(async (manager) => {
      // Pessimistic lock without relations: TypeORM refuses locks on joined queries.
      const payment = await manager.findOne(PaymentTransaction, {
        where: { transactionId: paymentIntentId },
        lock: { mode: "pessimistic_write" },
      });

      if (!payment) {
        this.logger.warn(
          `No payment transaction for PaymentIntent ${paymentIntentId}; ignoring`,
        );
        return null;
      }

      const paymentWithOrder = await manager.findOne(PaymentTransaction, {
        where: { id: payment.id },
        relations: [
          "order",
          "order.buyer",
          "order.orderItems",
          "order.orderItems.listing",
          "order.orderItems.listing.inventoryItem",
        ],
      });
      const order = paymentWithOrder?.order;

      if (!order) {
        this.logger.warn(
          `No order attached to PaymentIntent ${paymentIntentId}; ignoring`,
        );
        return null;
      }

      this.assertPaymentMatchesOrder(order, intent, paymentIntentId);

      if (payment.status !== PaymentStatus.COMPLETED) {
        payment.status = PaymentStatus.COMPLETED;
        await manager.save(payment);
      }

      if (order.status !== OrderStatus.PENDING) {
        return null; // Already processed by the concurrent caller
      }

      order.status = OrderStatus.PAID;
      order.reservationExpiresAt = null;
      await manager.save(order);

      // Transition physical inventory from reserved to sold for inventory-backed listings
      for (const item of order.orderItems || []) {
        if (
          item.listing?.isInventoryBacked &&
          item.listing?.inventoryItem?.id
        ) {
          const inv = await manager.findOne(CollectionItem, {
            where: { id: item.listing.inventoryItem.id },
            lock: { mode: "pessimistic_write" },
          });
          if (inv) {
            inv.quantityReserved = Math.max(
              0,
              inv.quantityReserved - item.quantity,
            );
            inv.quantitySold = (inv.quantitySold || 0) + item.quantity;
            await manager.save(CollectionItem, inv);
          }
        }
      }

      if (this.sellerSettlementService) {
        await this.sellerSettlementService.createAllocationsForOrder(
          order,
          manager,
        );
      }

      await this.auditService.record(
        {
          actorId: order.buyer?.id ?? null,
          actorRole: "buyer",
          targetType: "order",
          targetId: String(order.id),
          action: "order.paid",
          reason: `Payment confirmed via PaymentIntent ${paymentIntentId}`,
          beforeState: { status: OrderStatus.PENDING },
          afterState: { status: OrderStatus.PAID },
        },
        manager,
      );

      await this.outboxService.record(
        {
          eventType: "order.paid",
          aggregateType: "order",
          aggregateId: String(order.id),
          payload: {
            orderId: order.id,
            buyerId: order.buyer?.id ?? null,
            amount: order.totalAmount,
            currency: order.currency,
          },
        },
        manager,
      );

      return order;
    });

    // Side effects run outside the transaction, and only for the winner.
    if (paidOrder) {
      this.emitSaleEvents(paidOrder);
      this.recordSaleSignals(paidOrder);
    }
  }

  private assertPaymentMatchesOrder(
    order: Order,
    intent: {
      amount: number;
      currency: string;
      metadata?: Record<string, string> | null;
    },
    paymentIntentId: string,
  ): void {
    const expectedAmountCents = Math.round(Number(order.totalAmount) * 100);

    if (intent.amount !== expectedAmountCents) {
      this.logger.warn(
        `Payment amount mismatch on order ${order.id}: Stripe=${intent.amount}, expected=${expectedAmountCents}`,
      );
      throw new BadRequestException(
        "Le montant payé ne correspond pas à la commande",
      );
    }

    if (
      intent.currency?.toUpperCase() !== String(order.currency).toUpperCase()
    ) {
      this.logger.warn(
        `Payment currency mismatch on order ${order.id}: Stripe=${intent.currency}, expected=${order.currency}`,
      );
      throw new BadRequestException(
        "La devise du paiement ne correspond pas à la commande",
      );
    }

    const metadataOrderId = intent.metadata?.orderId;
    if (metadataOrderId && Number(metadataOrderId) !== order.id) {
      this.logger.warn(
        `PaymentIntent ${paymentIntentId} references order ${metadataOrderId}, not ${order.id}`,
      );
      throw new BadRequestException(
        "Ce paiement ne correspond pas à cette commande",
      );
    }

    const metadataUserId = intent.metadata?.userId;
    if (
      metadataUserId &&
      order.buyer &&
      Number(metadataUserId) !== order.buyer.id
    ) {
      this.logger.warn(
        `PaymentIntent ${paymentIntentId} was created by user ${metadataUserId}, order belongs to ${order.buyer.id}`,
      );
      throw new BadRequestException(
        "Ce paiement ne correspond pas à cet acheteur",
      );
    }
  }

  private emitSaleEvents(order: Order): void {
    const sellerTotals = new Map<number, number>();

    for (const item of order.orderItems ?? []) {
      const sellerId = item.seller?.id;
      if (!sellerId) continue;
      const previous = sellerTotals.get(sellerId) ?? 0;
      sellerTotals.set(
        sellerId,
        previous + Number(item.unitPrice) * item.quantity,
      );
    }

    for (const [sellerUserId, total] of sellerTotals.entries()) {
      this.eventEmitter.emit("marketplace.sale", {
        sellerUserId,
        buyerUserId: order.buyer?.id,
        orderId: order.id,
        total,
        currency: order.currency,
      });
    }
  }

  private recordSaleSignals(order: Order): void {
    for (const item of order.orderItems ?? []) {
      const cardId = item.listing?.pokemonCard?.id;
      if (!cardId) continue;
      this.cardPopularityService
        .recordEvent(
          {
            cardId,
            eventType: CardEventType.SALE,
            context: { listingId: item.listing?.id },
          },
          order.buyer?.id,
        )
        .catch((err) =>
          this.logger.warn(`Failed to record sale event: ${err.message}`),
        );
    }
  }

  async handlePaymentSucceeded(
    paymentIntentId: string,
    intent?: {
      amount: number;
      currency: string;
      metadata?: Record<string, string> | null;
    },
  ): Promise<void> {
    if (!intent) {
      const retrieved =
        await this.stripeService.retrievePaymentIntent(paymentIntentId);
      intent = {
        amount: retrieved.amount,
        currency: retrieved.currency,
        metadata: retrieved.metadata,
      };
    }
    await this.markOrderPaid(paymentIntentId, intent);
  }

  async handlePaymentFailed(paymentIntentId: string): Promise<void> {
    const payment = await this.paymentTransactionRepository.findOne({
      where: { transactionId: paymentIntentId },
      relations: ["order"],
    });

    if (!payment?.order) {
      this.logger.warn(
        `No order attached to failed PaymentIntent ${paymentIntentId}`,
      );
      return;
    }

    if (payment.status !== PaymentStatus.FAILED) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentTransactionRepository.save(payment);
    }

    await this.cancelOrder(payment.order.id, "payment failed");
  }

  /** Reconciles individual provider refunds; cumulative webhook amounts are not a full-refund signal. */
  async handlePaymentRefunded(
    paymentIntentId: string,
    _latestRefundId?: string,
    _refundAmount?: number,
  ): Promise<void> {
    await this.refundFinance.reconcilePaymentRefunds(paymentIntentId);
  }

  async transitionOrder(
    orderId: number,
    nextStatus: OrderStatus,
    options: { allowNoop?: boolean } = {},
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      // Lock without relations: Postgres rejects FOR UPDATE on the nullable side
      // of a LEFT JOIN; relations are reloaded once the row lock is acquired.
      const locked = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: "pessimistic_write" },
      });

      if (!locked) {
        throw new NotFoundException(`Commande ${orderId} introuvable`);
      }

      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: ["buyer", "orderItems", "orderItems.listing"],
      });

      if (!order) {
        throw new NotFoundException(`Commande ${orderId} introuvable`);
      }

      if (order.status === nextStatus) {
        if (options.allowNoop) return order;
        throw new BadRequestException(
          `La commande est déjà au statut ${nextStatus}`,
        );
      }

      const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(nextStatus)) {
        throw new BadRequestException(
          `Une commande ne peut pas passer de ${order.status} à ${nextStatus}`,
        );
      }

      const previousStatus = order.status;
      order.status = nextStatus;

      if (nextStatus !== OrderStatus.PENDING) {
        order.reservationExpiresAt = null;
      }

      // NOTE: A refund moves money, not physical inventory. Returned goods
      // require an explicit inspected disposition before they can be resold.
      // Paid orders can already contain individually shipped lines even while
      // their aggregate status remains Paid; only unpaid reservations release here.
      if (
        nextStatus === OrderStatus.CANCELLED &&
        previousStatus === OrderStatus.PENDING
      ) {
        await this.releaseStock(order, manager);
      }

      const saved = await manager.save(Order, order);

      await this.auditService.record(
        {
          actorId: order.buyer?.id ?? null,
          actorRole: "system",
          targetType: "order",
          targetId: String(order.id),
          action: `order.status_${nextStatus.toLowerCase()}`,
          reason: `Transitioned from ${previousStatus} to ${nextStatus}`,
          beforeState: { status: previousStatus },
          afterState: { status: nextStatus },
        },
        manager,
      );

      await this.outboxService.record(
        {
          eventType: `order.${nextStatus.toLowerCase()}`,
          aggregateType: "order",
          aggregateId: String(order.id),
          payload: { orderId: order.id, previousStatus, nextStatus },
        },
        manager,
      );

      if (
        previousStatus !== OrderStatus.SHIPPED &&
        nextStatus === OrderStatus.SHIPPED &&
        order.buyer?.id
      ) {
        this.eventEmitter.emit("order.shipped", {
          buyerUserId: order.buyer.id,
          orderId: order.id,
          trackingNumber: order.orderItems?.find((i) => i.trackingNumber)
            ?.trackingNumber,
        });
      }

      return saved;
    });
  }

  private async releaseStock(
    order: Order,
    manager: EntityManager,
  ): Promise<void> {
    if (order.stockReleased) return;

    for (const item of order.orderItems ?? []) {
      if (!item.listing) continue;
      await manager.increment(
        Listing,
        { id: item.listing.id },
        "quantityAvailable",
        item.quantity,
      );
    }

    order.stockReleased = true;
  }

  private async cancelOrder(orderId: number, reason: string): Promise<void> {
    try {
      await this.transitionOrder(orderId, OrderStatus.CANCELLED, {
        allowNoop: true,
      });
      this.logger.log(`Order ${orderId} cancelled (${reason})`);
    } catch (err) {
      this.logger.error(
        `Failed to cancel order ${orderId} (${reason}): ${(err as Error).message}`,
      );
    }
  }

  async expireStaleReservations(): Promise<number> {
    const staleOrders = await this.orderRepository.find({
      where: {
        status: OrderStatus.PENDING,
        reservationExpiresAt: LessThan(new Date()),
      },
      select: { id: true },
    });

    for (const { id } of staleOrders) {
      await this.cancelOrder(id, "reservation expired");
    }

    if (staleOrders.length > 0) {
      this.logger.log(`Released ${staleOrders.length} expired reservation(s)`);
    }

    return staleOrders.length;
  }

  async findOrdersByBuyerId(buyerId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { buyer: { id: buyerId } },
      relations: ORDER_RELATIONS,
      order: { createdAt: "DESC" },
    });
  }

  async findOrderById(id: number, userId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ORDER_RELATIONS,
    });

    if (!order) {
      throw new NotFoundException(`Commande ${id} introuvable`);
    }

    if (order.buyer.id !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez consulter que vos propres commandes",
      );
    }

    return order;
  }

  async findOrderByIdAsAdmin(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ORDER_RELATIONS,
    });

    if (!order) {
      throw new NotFoundException(`Commande ${id} introuvable`);
    }

    return order;
  }

  async findAllOrders(
    params: AdminOrderQueryDto,
  ): Promise<PaginatedResult<Order>> {
    const { page = 1, limit = 20, status, buyerId, sellerId } = params;
    const qb = this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.buyer", "buyer")
      .leftJoinAndSelect("order.orderItems", "orderItem")
      .leftJoinAndSelect("orderItem.seller", "seller")
      .leftJoinAndSelect("orderItem.listing", "listing")
      .leftJoinAndSelect("listing.pokemonCard", "pokemonCard")
      .leftJoinAndSelect("listing.sealedProduct", "sealedProduct")
      .leftJoinAndSelect("order.payments", "payment");

    if (status) {
      qb.andWhere("order.status = :status", { status });
    }
    if (buyerId) {
      qb.andWhere("buyer.id = :buyerId", { buyerId });
    }
    if (sellerId) {
      qb.andWhere("seller.id = :sellerId", { sellerId });
    }

    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      "order.createdAt",
      "DESC",
    );
  }

  async findSalesBySellerId(
    sellerId: number,
    params: { page?: number; limit?: number; fulfillmentStatus?: string } = {},
  ): Promise<PaginatedResult<OrderItem>> {
    const { page = 1, limit = 20, fulfillmentStatus } = params;

    const qb = this.orderItemRepository
      .createQueryBuilder("orderItem")
      .leftJoinAndSelect("orderItem.order", "order")
      .leftJoinAndSelect("order.buyer", "buyer")
      .where("orderItem.seller_id = :sellerId", { sellerId })
      .andWhere("order.status IN (:...statuses)", {
        statuses: [
          OrderStatus.PAID,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
          OrderStatus.REFUNDED,
        ],
      });

    if (fulfillmentStatus) {
      qb.andWhere("orderItem.fulfillmentStatus = :fulfillmentStatus", {
        fulfillmentStatus,
      });
    }

    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      "order.createdAt",
      "DESC",
    );
  }

  async updateFulfillment(
    orderItemId: number,
    dto: UpdateFulfillmentDto,
    seller: User,
  ): Promise<OrderItem> {
    const orderItem = await this.orderItemRepository.findOne({
      where: { id: orderItemId },
      relations: ["order", "order.buyer", "seller"],
    });

    if (!orderItem) {
      throw new NotFoundException(
        `Ligne de commande ${orderItemId} introuvable`,
      );
    }

    if (orderItem.seller?.id !== seller.id) {
      throw new ForbiddenException(
        "Vous ne pouvez traiter que vos propres ventes",
      );
    }

    if (orderItem.order.status === OrderStatus.PENDING) {
      throw new BadRequestException({
        code: "ORDER_NOT_PAID",
        message: "Cette commande n'a pas encore été payée",
      });
    }

    const allowed = FULFILLMENT_TRANSITIONS[orderItem.fulfillmentStatus] ?? [];
    if (!allowed.includes(dto.fulfillmentStatus)) {
      throw new BadRequestException(
        `Une vente ne peut pas passer de ${orderItem.fulfillmentStatus} à ${dto.fulfillmentStatus}`,
      );
    }

    if (dto.fulfillmentStatus === FulfillmentStatus.SHIPPED) {
      if (!dto.carrier || !dto.trackingNumber) {
        throw new BadRequestException(
          "Le transporteur et le numéro de suivi sont obligatoires pour marquer une vente comme expédiée",
        );
      }
      orderItem.carrier = dto.carrier;
      orderItem.trackingNumber = dto.trackingNumber;
      orderItem.shippedAt = new Date();
    }

    if (dto.fulfillmentStatus === FulfillmentStatus.DELIVERED) {
      orderItem.deliveredAt = new Date();
    }

    orderItem.fulfillmentStatus = dto.fulfillmentStatus;
    const saved = await this.orderItemRepository.save(orderItem);

    await this.syncOrderStatusFromFulfillment(orderItem.order.id);

    return saved;
  }

  private async syncOrderStatusFromFulfillment(orderId: number): Promise<void> {
    const items = await this.orderItemRepository.find({
      where: { order: { id: orderId } },
    });

    const active = items.filter(
      (i) => i.fulfillmentStatus !== FulfillmentStatus.CANCELLED,
    );
    if (active.length === 0) return;

    const allDelivered = active.every(
      (i) => i.fulfillmentStatus === FulfillmentStatus.DELIVERED,
    );
    const allShipped = active.every((i) =>
      [FulfillmentStatus.SHIPPED, FulfillmentStatus.DELIVERED].includes(
        i.fulfillmentStatus,
      ),
    );

    const target = allDelivered
      ? OrderStatus.DELIVERED
      : allShipped
        ? OrderStatus.SHIPPED
        : null;

    if (!target) return;

    try {
      await this.transitionOrder(orderId, target, { allowNoop: true });
    } catch (err) {
      this.logger.warn(
        `Could not sync order ${orderId} to ${target}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Confirms delivery of an order item by the buyer (MKT-05).
   *
   * @param orderId - Order identifier.
   * @param itemId - OrderItem identifier.
   * @param buyer - Authenticated buyer confirming receipt.
   * @returns Updated OrderItem.
   * @throws NotFoundException If the item does not exist.
   * @throws ForbiddenException If the caller is not the buyer or admin.
   * @throws BadRequestException If the item is not currently shipped.
   */
  async confirmItemReceipt(
    orderId: number,
    itemId: number,
    buyer: User,
  ): Promise<OrderItem> {
    const orderItem = await this.orderItemRepository.findOne({
      where: { id: itemId, order: { id: orderId } },
      relations: ["order", "order.buyer", "seller"],
    });

    if (!orderItem) {
      throw new NotFoundException(
        `Article ${itemId} introuvable pour la commande ${orderId}`,
      );
    }

    const isBuyer = orderItem.order.buyer?.id === buyer.id;
    const isAdmin =
      buyer.role === UserRole.ADMIN || buyer.role === UserRole.MODERATOR;

    if (!isBuyer && !isAdmin) {
      throw new ForbiddenException(
        "Vous ne pouvez confirmer la réception que pour vos propres commandes",
      );
    }

    if (
      orderItem.fulfillmentStatus !== FulfillmentStatus.SHIPPED &&
      orderItem.fulfillmentStatus !== FulfillmentStatus.DELIVERED
    ) {
      throw new BadRequestException(
        "Seul un article expédié peut être confirmé comme reçu",
      );
    }

    orderItem.fulfillmentStatus = FulfillmentStatus.DELIVERED;
    orderItem.deliveredAt = orderItem.deliveredAt || new Date();
    const saved = await this.orderItemRepository.save(orderItem);

    if (this.sellerSettlementService) {
      await this.sellerSettlementService.onItemDelivered(saved);
    }

    await this.syncOrderStatusFromFulfillment(orderId);

    await this.auditService.record({
      actorId: buyer.id,
      actorRole: buyer.role ?? "buyer",
      targetType: "order_item",
      targetId: String(orderItem.id),
      action: "order.item_delivered",
      reason: "Receipt confirmed by buyer",
      afterState: { fulfillmentStatus: FulfillmentStatus.DELIVERED },
    });

    await this.outboxService.record({
      eventType: "order.item_delivered",
      aggregateType: "order_item",
      aggregateId: String(orderItem.id),
      payload: {
        orderId,
        orderItemId: orderItem.id,
        sellerId: orderItem.seller?.id,
        buyerId: buyer.id,
        deliveredAt: orderItem.deliveredAt,
      },
    });

    return saved;
  }

  /**
   * Opens an item-specific claim and attaches a support ticket (MKT-04).
   *
   * @param orderId - Order identifier.
   * @param itemId - OrderItem identifier.
   * @param dto - Claim category and details.
   * @param buyer - Authenticated buyer.
   * @returns Created SupportTicket.
   */
  async createItemClaim(
    orderId: number,
    itemId: number,
    dto: CreateClaimDto,
    buyer: User,
  ): Promise<SupportTicket> {
    const orderItem = await this.orderItemRepository.findOne({
      where: { id: itemId, order: { id: orderId } },
      relations: ["order", "order.buyer", "seller"],
    });

    if (!orderItem) {
      throw new NotFoundException(
        `Article ${itemId} introuvable pour la commande ${orderId}`,
      );
    }

    const isBuyer = orderItem.order.buyer?.id === buyer.id;
    const isAdmin =
      buyer.role === UserRole.ADMIN || buyer.role === UserRole.MODERATOR;

    if (!isBuyer && !isAdmin) {
      throw new ForbiddenException(
        "Vous ne pouvez ouvrir une réclamation que pour vos propres commandes",
      );
    }

    const ticket = this.supportTicketRepository.create({
      user: buyer,
      order: orderItem.order,
      orderItem,
      subject: dto.subject,
      message: dto.message,
      claimCategory: dto.claimCategory,
      status: SupportTicketStatusType.opened,
    });

    const saved = await this.supportTicketRepository.save(ticket);

    // Freeze the seller's proceeds for the duration of the claim (MKT-04/MKT-06).
    if (this.sellerSettlementService && orderItem.seller?.id) {
      await this.sellerSettlementService.onClaimOpened(
        orderId,
        orderItem.seller.id,
        saved.id,
      );
    }

    await this.auditService.record({
      actorId: buyer.id,
      actorRole: buyer.role ?? "buyer",
      targetType: "support_ticket",
      targetId: String(saved.id),
      action: "claim.opened",
      reason: dto.subject,
      afterState: {
        orderId,
        orderItemId: itemId,
        claimCategory: dto.claimCategory,
      },
    });

    await this.outboxService.record({
      eventType: "claim.opened",
      aggregateType: "support_ticket",
      aggregateId: String(saved.id),
      payload: {
        ticketId: saved.id,
        orderId,
        orderItemId: itemId,
        claimCategory: dto.claimCategory,
        buyerId: buyer.id,
        sellerId: orderItem.seller?.id,
      },
    });

    return saved;
  }

  async getSellerRevenue(sellerId: number): Promise<{
    totalSales: number;
    revenueByCurrency: Record<string, number>;
    shippingByCurrency: Record<string, number>;
  }> {
    const rows = await this.orderItemRepository
      .createQueryBuilder("orderItem")
      .leftJoin("orderItem.order", "order")
      .select("order.currency", "currency")
      .addSelect(
        "SUM(orderItem.unitPrice * orderItem.quantity + orderItem.shippingCost)",
        "revenue",
      )
      .addSelect("SUM(orderItem.shippingCost)", "shipping")
      .addSelect("COUNT(DISTINCT order.id)", "sales")
      .where("orderItem.seller_id = :sellerId", { sellerId })
      .andWhere("order.status IN (:...statuses)", {
        statuses: [
          OrderStatus.PAID,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
        ],
      })
      .andWhere("orderItem.fulfillmentStatus != :cancelled", {
        cancelled: FulfillmentStatus.CANCELLED,
      })
      .groupBy("order.currency")
      .getRawMany();

    const revenueByCurrency: Record<string, number> = {};
    const shippingByCurrency: Record<string, number> = {};
    let totalSales = 0;

    for (const row of rows) {
      const currency = String(row.currency ?? Currency.EUR);
      revenueByCurrency[currency] = round2(parseFloat(row.revenue) || 0);
      shippingByCurrency[currency] = round2(parseFloat(row.shipping) || 0);
      totalSales += parseInt(String(row.sales), 10) || 0;
    }

    return { totalSales, revenueByCurrency, shippingByCurrency };
  }

  async getSalesTotalsBySellerIds(
    sellerIds: number[],
  ): Promise<Map<number, { totalSales: number; totalRevenue: number }>> {
    const totals = new Map<
      number,
      { totalSales: number; totalRevenue: number }
    >();

    if (sellerIds.length === 0) return totals;

    const rows = await this.orderItemRepository
      .createQueryBuilder("orderItem")
      .leftJoin("orderItem.order", "order")
      .select("orderItem.seller_id", "sellerId")
      .addSelect("SUM(orderItem.unitPrice * orderItem.quantity)", "revenue")
      .addSelect("COUNT(DISTINCT order.id)", "sales")
      .where("orderItem.seller_id IN (:...sellerIds)", { sellerIds })
      .andWhere("order.status IN (:...statuses)", {
        statuses: [
          OrderStatus.PAID,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
        ],
      })
      .groupBy("orderItem.seller_id")
      .getRawMany();

    for (const row of rows) {
      totals.set(Number(row.sellerId), {
        totalSales: parseInt(String(row.sales), 10) || 0,
        totalRevenue: Math.round((parseFloat(row.revenue) || 0) * 100) / 100,
      });
    }

    return totals;
  }
}
