import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DataSource,
  EntityManager,
  In,
  LessThan,
  QueryFailedError,
  Repository,
} from "typeorm";
import { Currency } from "../common/enums/currency";
import {
  FULFILLMENT_TRANSITIONS,
  FulfillmentStatus,
} from "../common/enums/fulfillment-status";
import { ProductKind } from "../common/enums/product-kind";
import { PaginatedResult, PaginationHelper } from "../helpers/pagination";
import { User } from "../user/entities/user.entity";
import { CartItem } from "../user_cart/entities/cart-item.entity";
import { UserCartService } from "../user_cart/user_cart.service";
import { CardPopularityService } from "./card-popularity.service";
import { AdminOrderQueryDto } from "./dto/admin-order-query.dto";
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
import { StripeService } from "./stripe.service";

/** Durée pendant laquelle le stock reste réservé sans paiement confirmé. */
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
  currency: Currency;
}

/**
 * Cycle de vie d'une commande, de la réservation de stock au suivi
 * d'expédition.
 *
 * L'ordre des opérations est volontairement : commande + réservation du
 * stock d'abord, paiement ensuite. L'inverse expose l'acheteur à être
 * débité sans commande si le stock a disparu entre-temps.
 */
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
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    private readonly stripeService: StripeService,
    private readonly userCartService: UserCartService,
    private readonly cardPopularityService: CardPopularityService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------
  // Checkout
  // ---------------------------------------------------------------------

  /**
   * Crée une commande PENDING, réserve le stock, puis ouvre un PaymentIntent
   * rattaché à cette commande. Le client n'est jamais débité avant que sa
   * commande n'existe.
   */
  async startCheckout(
    dto: StartCheckoutDto,
    user: User,
  ): Promise<CheckoutResult> {
    const cart = await this.userCartService.findCartByUserId(user.id);
    const cartItems = cart?.cartItems ?? [];

    if (cartItems.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    for (const item of cartItems) {
      if (item.listing.seller && item.listing.seller.id === user.id) {
        throw new BadRequestException("You cannot purchase your own listing");
      }
    }

    const currencies = [...new Set(cartItems.map((i) => i.listing.currency))];
    if (currencies.length > 1) {
      throw new BadRequestException(
        "All items in cart must use the same currency",
      );
    }
    const currency = currencies[0];

    const order = await this.reserveStockAndCreateOrder(
      cartItems,
      currency,
      dto.shippingAddress.trim(),
      user,
    );

    // Le PaymentIntent est créé après la réservation : si Stripe échoue, on
    // rend le stock au lieu de laisser une commande orpheline.
    try {
      const paymentIntent = await this.stripeService.createPaymentIntent(
        Number(order.totalAmount),
        currency,
        {
          orderId: String(order.id),
          userId: String(user.id),
        },
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

  /**
   * Réserve le stock et matérialise la commande dans une seule transaction.
   * Le verrou pessimiste empêche deux acheteurs de prendre le dernier
   * exemplaire simultanément.
   */
  private async reserveStockAndCreateOrder(
    cartItems: CartItem[],
    currency: Currency,
    shippingAddress: string,
    user: User,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      let totalAmount = 0;

      for (const item of cartItems) {
        const freshListing = await manager.findOne(Listing, {
          where: { id: item.listing.id },
          lock: { mode: "pessimistic_write" },
        });

        if (!freshListing) {
          throw new BadRequestException(
            `Listing ${item.listing.id} is no longer available`,
          );
        }

        if (
          freshListing.expiresAt &&
          new Date(freshListing.expiresAt) <= new Date()
        ) {
          throw new BadRequestException(
            `"${this.describeItem(item)}" is no longer for sale`,
          );
        }

        if (freshListing.quantityAvailable < item.quantity) {
          throw new BadRequestException(
            `Not enough quantity for "${this.describeItem(item)}". Available: ${freshListing.quantityAvailable}, Requested: ${item.quantity}`,
          );
        }

        // Le prix retenu est celui de la base, jamais celui envoyé par le client.
        totalAmount += Number(freshListing.price) * item.quantity;
      }

      const reservationExpiresAt = new Date(
        Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000,
      );

      const order = manager.create(Order, {
        buyer: user,
        totalAmount,
        status: OrderStatus.PENDING,
        currency,
        shippingAddress,
        reservationExpiresAt,
        stockReleased: false,
        orderItems: cartItems.map((item) =>
          manager.create(OrderItem, this.buildOrderItemSnapshot(item)),
        ),
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

      return savedOrder;
    });
  }

  /**
   * Fige tout ce dont la commande aura besoin plus tard : l'annonce peut
   * être modifiée ou supprimée, la commande doit rester lisible.
   */
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
      fulfillmentStatus: FulfillmentStatus.TO_SHIP,
    };
  }

  private describeItem(item: CartItem): string {
    const { listing } = item;
    return (
      listing.pokemonCard?.name ??
      listing.sealedProduct?.nameEn ??
      "Produit inconnu"
    );
  }

  // ---------------------------------------------------------------------
  // Confirmation du paiement
  // ---------------------------------------------------------------------

  /**
   * Confirme une commande à partir de l'état réel du PaymentIntent chez
   * Stripe. Appelée au retour du checkout ; le webhook fait la même chose de
   * son côté, la première des deux gagne.
   */
  async confirmOrderPayment(orderId: number, user: User): Promise<Order> {
    const order = await this.findOrderById(orderId, user.id);

    const payment = await this.paymentTransactionRepository.findOne({
      where: { order: { id: order.id } },
      order: { createdAt: "DESC" },
    });

    if (!payment?.transactionId) {
      throw new BadRequestException("No payment attached to this order");
    }

    if (order.status !== OrderStatus.PENDING) {
      return order;
    }

    const paymentIntent = await this.stripeService.retrievePaymentIntent(
      payment.transactionId,
    );

    if (paymentIntent.status !== "succeeded") {
      throw new BadRequestException(
        `Payment not completed. Status: ${paymentIntent.status}`,
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
   * Applique le passage à PAID de façon idempotente, après avoir vérifié que
   * le paiement correspond bien à la commande (montant, devise, acheteur).
   */
  private async markOrderPaid(
    paymentIntentId: string,
    intent: {
      amount: number;
      currency: string;
      metadata?: Record<string, string> | null;
    },
  ): Promise<void> {
    const payment = await this.paymentTransactionRepository.findOne({
      where: { transactionId: paymentIntentId },
      relations: ["order", "order.buyer", "order.orderItems"],
    });

    if (!payment?.order) {
      this.logger.warn(
        `No order attached to PaymentIntent ${paymentIntentId}; ignoring`,
      );
      return;
    }

    const order = payment.order;
    this.assertPaymentMatchesOrder(order, intent, paymentIntentId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      payment.status = PaymentStatus.COMPLETED;
      await this.paymentTransactionRepository.save(payment);
    }

    if (order.status !== OrderStatus.PENDING) {
      return; // déjà traité (webhook et retour client peuvent se croiser)
    }

    order.status = OrderStatus.PAID;
    order.reservationExpiresAt = null;
    await this.orderRepository.save(order);

    this.emitSaleEvents(order);
    this.recordSaleSignals(order);
  }

  /**
   * Un PaymentIntent ne vaut que pour la commande qui l'a ouvert : on refuse
   * tout écart de montant, de devise ou d'identité.
   */
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
      throw new BadRequestException("Payment amount does not match the order");
    }

    if (
      intent.currency?.toUpperCase() !== String(order.currency).toUpperCase()
    ) {
      this.logger.warn(
        `Payment currency mismatch on order ${order.id}: Stripe=${intent.currency}, expected=${order.currency}`,
      );
      throw new BadRequestException(
        "Payment currency does not match the order",
      );
    }

    const metadataOrderId = intent.metadata?.orderId;
    if (metadataOrderId && Number(metadataOrderId) !== order.id) {
      this.logger.warn(
        `PaymentIntent ${paymentIntentId} references order ${metadataOrderId}, not ${order.id}`,
      );
      throw new BadRequestException("Payment does not belong to this order");
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
      throw new BadRequestException("Payment does not belong to this buyer");
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

  // ---------------------------------------------------------------------
  // Webhooks Stripe — source de vérité du paiement
  // ---------------------------------------------------------------------

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

  async handlePaymentRefunded(paymentIntentId: string): Promise<void> {
    const payment = await this.paymentTransactionRepository.findOne({
      where: { transactionId: paymentIntentId },
      relations: ["order"],
    });

    if (!payment?.order) {
      this.logger.warn(
        `No order attached to refunded PaymentIntent ${paymentIntentId}`,
      );
      return;
    }

    if (payment.status !== PaymentStatus.REFUNDED) {
      payment.status = PaymentStatus.REFUNDED;
      await this.paymentTransactionRepository.save(payment);
    }

    await this.transitionOrder(payment.order.id, OrderStatus.REFUNDED, {
      allowNoop: true,
    });
  }

  // ---------------------------------------------------------------------
  // Machine d'état
  // ---------------------------------------------------------------------

  /**
   * Change le statut d'une commande en respectant les transitions autorisées
   * et en rendant le stock une seule fois.
   */
  async transitionOrder(
    orderId: number,
    nextStatus: OrderStatus,
    options: { allowNoop?: boolean } = {},
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: ["buyer", "orderItems", "orderItems.listing"],
        lock: { mode: "pessimistic_write" },
      });

      if (!order) {
        throw new NotFoundException(`Order with id ${orderId} not found`);
      }

      if (order.status === nextStatus) {
        if (options.allowNoop) return order;
        throw new BadRequestException(
          `Order is already in status ${nextStatus}`,
        );
      }

      const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(nextStatus)) {
        throw new BadRequestException(
          `Cannot move an order from ${order.status} to ${nextStatus}`,
        );
      }

      const previousStatus = order.status;
      order.status = nextStatus;

      if (nextStatus !== OrderStatus.PENDING) {
        order.reservationExpiresAt = null;
      }

      if (
        nextStatus === OrderStatus.CANCELLED ||
        nextStatus === OrderStatus.REFUNDED
      ) {
        await this.releaseStock(order, manager);
      }

      const saved = await manager.save(Order, order);

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

  /** Restitue le stock réservé. Le drapeau stockReleased rend l'opération rejouable. */
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

  /**
   * Libère les commandes dont la réservation a expiré sans paiement.
   * Sans cela, un panier abandonné bloquerait le stock indéfiniment.
   */
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

  // ---------------------------------------------------------------------
  // Lecture
  // ---------------------------------------------------------------------

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
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    if (order.buyer.id !== userId) {
      throw new ForbiddenException("You can only access your own orders");
    }

    return order;
  }

  async findOrderByIdAsAdmin(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ORDER_RELATIONS,
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
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

  // ---------------------------------------------------------------------
  // Espace vendeur
  // ---------------------------------------------------------------------

  /**
   * Ventes à traiter par un vendeur : ses lignes de commande payées, avec
   * l'adresse de livraison et l'acheteur.
   */
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
      // Une commande non payée n'a pas à apparaître dans les ventes à traiter.
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

  /**
   * Fait avancer l'expédition d'une ligne. Seul le vendeur de la ligne peut
   * la modifier, et seulement selon les transitions autorisées.
   */
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
      throw new NotFoundException(`Order item ${orderItemId} not found`);
    }

    if (orderItem.seller?.id !== seller.id) {
      throw new ForbiddenException("You can only fulfil your own sales");
    }

    if (orderItem.order.status === OrderStatus.PENDING) {
      throw new BadRequestException("This order has not been paid yet");
    }

    const allowed = FULFILLMENT_TRANSITIONS[orderItem.fulfillmentStatus] ?? [];
    if (!allowed.includes(dto.fulfillmentStatus)) {
      throw new BadRequestException(
        `Cannot move a sale from ${orderItem.fulfillmentStatus} to ${dto.fulfillmentStatus}`,
      );
    }

    if (dto.fulfillmentStatus === FulfillmentStatus.SHIPPED) {
      if (!dto.carrier || !dto.trackingNumber) {
        throw new BadRequestException(
          "Carrier and tracking number are required to mark a sale as shipped",
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

  /**
   * Aligne le statut global de la commande sur celui de ses lignes : une
   * commande multi-vendeurs n'est expédiée que lorsque tout est parti.
   */
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
      // Une transition invalide ici (commande remboursée, par ex.) ne doit
      // pas faire échouer la mise à jour d'expédition du vendeur.
      this.logger.warn(
        `Could not sync order ${orderId} to ${target}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Chiffre d'affaires d'un vendeur, calculé sur ses propres lignes et
   * ventilé par devise : additionner des EUR et des USD n'aurait aucun sens.
   */
  async getSellerRevenue(sellerId: number): Promise<{
    totalSales: number;
    revenueByCurrency: Record<string, number>;
  }> {
    const rows = await this.orderItemRepository
      .createQueryBuilder("orderItem")
      .leftJoin("orderItem.order", "order")
      .select("order.currency", "currency")
      .addSelect("SUM(orderItem.unitPrice * orderItem.quantity)", "revenue")
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
    let totalSales = 0;

    for (const row of rows) {
      const currency = String(row.currency ?? Currency.EUR);
      revenueByCurrency[currency] =
        Math.round((parseFloat(row.revenue) || 0) * 100) / 100;
      totalSales += parseInt(String(row.sales), 10) || 0;
    }

    return { totalSales, revenueByCurrency };
  }

  /** Ventes réalisées par plusieurs vendeurs, en une requête. */
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
