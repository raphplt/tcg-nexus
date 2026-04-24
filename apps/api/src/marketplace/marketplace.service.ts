import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserRole } from "src/common/enums/user";
import { DataSource, FindOptionsWhere, MoreThan, Repository } from "typeorm";
import { Card } from "../card/entities/card.entity";
import { Currency } from "../common/enums/currency";
import { ProductKind } from "../common/enums/product-kind";
import { PaginatedResult, PaginationHelper } from "../helpers/pagination";
import { SealedProduct } from "../sealed-product/entities/sealed-product.entity";
import { User } from "../user/entities/user.entity";
import { UserCartService } from "../user_cart/user_cart.service";
import { CardPopularityService } from "./card-popularity.service";
import { AdminOrderQueryDto } from "./dto/admin-order-query.dto";
import { CreateListingDto } from "./dto/create-marketplace.dto";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateListingDto } from "./dto/update-marketplace.dto";
import { CardEventType } from "./entities/card-event.entity";
import { Listing } from "./entities/listing.entity";
import { Order, OrderStatus } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import {
  PaymentMethod,
  PaymentStatus,
  PaymentTransaction,
} from "./entities/payment-transaction.entity";
import { PriceHistory } from "./entities/price-history.entity";
import { ExternalPricingService } from "./pricing";
import { StripeService } from "./stripe.service";

export interface FindAllListingsParams {
  sellerId?: number;
  pokemonCardId?: string;
  sealedProductId?: string;
  productKind?: ProductKind;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  cardState?: string;
  currency?: string;
  priceMin?: number;
  priceMax?: number;
}

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
    @InjectRepository(Card)
    private readonly pokemonCardRepository: Repository<Card>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly stripeService: StripeService,
    private readonly userCartService: UserCartService,
    private readonly cardPopularityService: CardPopularityService,
    private readonly externalPricingService: ExternalPricingService,
    private readonly dataSource: DataSource,
  ) {}

  private readonly logger = new Logger(MarketplaceService.name);

  async createOrder(createOrderDto: CreateOrderDto, user: User) {
    // vérifier le paiement avec Stripe
    const paymentIntent = await this.stripeService.retrievePaymentIntent(
      createOrderDto.paymentIntentId,
    );
    if (paymentIntent.status !== "succeeded") {
      throw new BadRequestException(
        `Payment not completed. Status: ${paymentIntent.status}`,
      );
    }

    // vérifier que le panier n'est pas vide
    const cart = await this.userCartService.findCartByUserId(user.id);
    if (!cart || cart.cartItems.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    // vérifier que l'utilisateur ne tente pas d'acheter ses propres annonces
    for (const item of cart.cartItems) {
      if (item.listing.seller && item.listing.seller.id === user.id) {
        throw new BadRequestException("You cannot purchase your own listing");
      }
    }

    // vérifier que toutes les annonces utilisent la même devise
    // TODO : à améliorer pour autoriser les paiements multi-devises
    const currencies = [
      ...new Set(cart.cartItems.map((item) => item.listing.currency)),
    ];
    if (currencies.length > 1) {
      throw new BadRequestException(
        "All items in cart must use the same currency",
      );
    }
    const orderCurrency = currencies[0];

    // recalculer le montant total pour éviter les manipulations côté client
    // TODO : à améliorer pour gérer les promotions, codes de réduction, etc.
    let totalAmount = 0;
    for (const item of cart.cartItems) {
      totalAmount += Number(item.listing.price) * item.quantity;
    }

    const expectedAmountCents = Math.round(totalAmount * 100);
    if (paymentIntent.amount !== expectedAmountCents) {
      this.logger.warn(
        `Payment amount mismatch: Stripe=${paymentIntent.amount}, Server=${expectedAmountCents}, user=${user.id}`,
      );
      throw new BadRequestException("Payment amount does not match cart total");
    }

    // transaction pour garantir la cohérence des données
    return this.dataSource.transaction(async (manager) => {
      for (const item of cart.cartItems) {
        // éviter les race conditions
        const freshListing = await manager.findOne(Listing, {
          where: { id: item.listing.id },
          lock: { mode: "pessimistic_write" },
        });

        if (!freshListing) {
          throw new BadRequestException(
            `Listing ${item.listing.id} is no longer available`,
          );
        }

        if (freshListing.quantityAvailable < item.quantity) {
          throw new BadRequestException(
            `Not enough quantity for "${item.listing.pokemonCard?.name || "item"}". Available: ${freshListing.quantityAvailable}, Requested: ${item.quantity}`,
          );
        }
      }

      // création de la commande
      const order = manager.create(Order, {
        buyer: user,
        totalAmount,
        status: OrderStatus.PAID,
        currency: orderCurrency,
        orderItems: cart.cartItems.map((item) =>
          manager.create(OrderItem, {
            listing: item.listing,
            quantity: item.quantity,
            unitPrice: item.listing.price,
          }),
        ),
      });
      const savedOrder = await manager.save(Order, order);

      // création de la transaction de paiement
      const payment = manager.create(PaymentTransaction, {
        order: savedOrder,
        method: PaymentMethod.CREDIT_CARD,
        status: PaymentStatus.COMPLETED,
        transactionId: createOrderDto.paymentIntentId,
        amount: totalAmount,
      });
      await manager.save(PaymentTransaction, payment);

      // décrémenter le stock
      for (const item of cart.cartItems) {
        await manager.decrement(
          Listing,
          { id: item.listing.id },
          "quantityAvailable",
          item.quantity,
        );
      }

      // vider le panier
      await this.userCartService.clearCart(user.id);

      // enregistrer les événements de popularité des cartes vendues
      for (const item of cart.cartItems) {
        const cardId = item.listing.pokemonCard?.id;
        if (!cardId) continue;
        this.cardPopularityService
          .recordEvent(
            {
              cardId,
              eventType: CardEventType.SALE,
              context: { listingId: item.listing.id },
            },
            user.id,
          )
          .catch((err) =>
            this.logger.warn(`Failed to record sale event: ${err.message}`),
          );
      }

      return savedOrder;
    });
  }

  async findAllOrders(params: AdminOrderQueryDto) {
    const { page = 1, limit = 20, status, buyerId, sellerId } = params;
    // construire la requête de base avec les jointures nécessaires
    const qb = this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.buyer", "buyer")
      .leftJoinAndSelect("order.orderItems", "orderItem")
      .leftJoinAndSelect("orderItem.listing", "listing")
      .leftJoinAndSelect("listing.seller", "seller")
      .leftJoinAndSelect("listing.pokemonCard", "pokemonCard")
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

  async create(createListingDto: CreateListingDto, user: User) {
    const productKind = createListingDto.productKind ?? ProductKind.CARD;

    if (productKind === ProductKind.CARD) {
      if (!createListingDto.pokemonCardId) {
        throw new BadRequestException(
          "pokemonCardId is required for card listings",
        );
      }
      if (!createListingDto.cardState) {
        throw new BadRequestException(
          "cardState is required for card listings",
        );
      }
    } else {
      if (!createListingDto.sealedProductId) {
        throw new BadRequestException(
          "sealedProductId is required for sealed listings",
        );
      }
    }

    const {
      pokemonCardId,
      sealedProductId,
      productKind: _kind,
      ...rest
    } = createListingDto;

    const listing = this.listingRepository.create({
      ...rest,
      productKind,
      seller: user,
      pokemonCard: pokemonCardId ? ({ id: pokemonCardId } as Card) : null,
      sealedProduct:
        productKind === ProductKind.SEALED && sealedProductId
          ? ({ id: sealedProductId } as SealedProduct)
          : null,
    });
    const savedListing = await this.listingRepository.save(listing);

    const listingWithRelations = await this.findOne(savedListing.id);
    await this.recordPriceHistory(listingWithRelations);

    return savedListing;
  }

  //TODO : à refacto
  async findAll(
    params: FindAllListingsParams = {},
  ): Promise<PaginatedResult<Listing>> {
    const {
      sellerId,
      pokemonCardId,
      sealedProductId,
      productKind,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "DESC",
      search,
      cardState,
      currency,
      priceMin,
      priceMax,
    } = params;

    const qb = this.listingRepository
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.seller", "seller")
      .leftJoinAndSelect("listing.pokemonCard", "pokemonCard")
      .leftJoinAndSelect("pokemonCard.set", "set")
      .leftJoinAndSelect("set.serie", "serie")
      .leftJoinAndSelect("listing.sealedProduct", "sealedProduct")
      .leftJoinAndSelect("sealedProduct.pokemonSet", "sealedSet")
      .where("(listing.expiresAt IS NULL OR listing.expiresAt > :now)", {
        now: new Date(),
      })
      .andWhere("listing.quantityAvailable > 0");

    if (sellerId) {
      qb.andWhere("seller.id = :sellerId", { sellerId });
    }
    if (productKind) {
      qb.andWhere("listing.productKind = :productKind", { productKind });
    }
    if (pokemonCardId) {
      qb.andWhere("pokemonCard.id = :pokemonCardId", { pokemonCardId });
    }
    if (sealedProductId) {
      qb.andWhere("sealedProduct.id = :sealedProductId", { sealedProductId });
    }
    if (cardState) {
      qb.andWhere("listing.cardState = :cardState", { cardState });
    }
    if (currency) {
      qb.andWhere("listing.currency = :currency", { currency });
    }
    if (typeof priceMin === "number") {
      qb.andWhere("listing.price >= :priceMin", { priceMin });
    }
    if (typeof priceMax === "number") {
      qb.andWhere("listing.price <= :priceMax", { priceMax });
    }
    if (search) {
      qb.andWhere(
        `(
          LOWER(pokemonCard.name) LIKE :search
          OR LOWER(seller.firstName) LIKE :search
          OR LOWER(seller.lastName) LIKE :search
          OR LOWER(set.name) LIKE :search
          OR LOWER(serie.name) LIKE :search
          OR LOWER(listing.description) LIKE :search
        )`,
        { search: `%${search.toLowerCase()}%` },
      );
    }
    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      sortBy ? `listing.${sortBy}` : undefined,
      sortOrder,
    );
  }

  async findOne(id: number): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: [
        "seller",
        "pokemonCard",
        "pokemonCard.set",
        "pokemonCard.set.serie",
        "sealedProduct",
        "sealedProduct.pokemonSet",
      ],
    });
    if (!listing) throw new NotFoundException("Listing not found");
    return listing;
  }

  async update(
    id: number,
    updateListingDto: UpdateListingDto,
    user: User,
  ): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ["seller"],
    });
    if (!listing) throw new NotFoundException("Listing not found");
    if (listing.seller.id !== user.id && user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `Refus update listing: user=${user.id} role=${user.role} targetListing=${id} seller=${listing.seller.id}`,
      );
      throw new ForbiddenException(
        "You are not allowed to update this listing",
      );
    }
    Object.assign(listing, updateListingDto);
    return this.listingRepository.save(listing);
  }

  async delete(id: number, user: User): Promise<void> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ["seller"],
    });
    if (!listing) throw new NotFoundException("Listing not found");
    if (listing.seller.id !== user.id && user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `Refus delete listing: user=${user.id} role=${user.role} targetListing=${id} seller=${listing.seller.id}`,
      );
      throw new ForbiddenException(
        "You are not allowed to delete this listing",
      );
    }
    await this.listingRepository.softRemove(listing);
  }

  async findBySellerId(
    sellerId: number,
    params: FindAllListingsParams = {},
  ): Promise<PaginatedResult<Listing>> {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "DESC",
      search,
      cardState,
      currency,
    } = params;

    const qb = this.listingRepository
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.seller", "seller")
      .leftJoinAndSelect("listing.pokemonCard", "pokemonCard")
      .leftJoinAndSelect("pokemonCard.set", "set")
      .leftJoinAndSelect("set.serie", "serie")
      .where("seller.id = :sellerId", { sellerId });

    if (search) {
      qb.andWhere(
        "(LOWER(pokemonCard.name) LIKE :search OR LOWER(set.name) LIKE :search)",
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (cardState) {
      qb.andWhere("listing.cardState = :cardState", { cardState });
    }

    if (currency) {
      qb.andWhere("listing.currency = :currency", { currency });
    }

    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      sortBy ? `listing.${sortBy}` : undefined,
      sortOrder,
    );
  }

  async getCardStatistics(
    cardId: string,
    currency?: string,
    cardState?: string,
  ) {
    // Lance le refresh externe en parallèle des stats listings pour masquer
    // la latence TCGdex. `getOrRefresh` retombe sur le pricing existant en
    // cas d'échec, donc jamais bloquant.
    const marketPricingPromise = this.externalPricingService
      .getOrRefresh(cardId)
      .catch(() => null);

    const card = await this.pokemonCardRepository.findOne({
      where: { id: cardId },
      select: ["id", "pricing"],
    });

    const statsQb = this.listingRepository
      .createQueryBuilder("listing")
      .select("COUNT(listing.id)", "totalListings")
      .addSelect("MIN(listing.price)", "minPrice")
      .addSelect("MAX(listing.price)", "maxPrice")
      .addSelect("AVG(listing.price)", "avgPrice")
      .where("listing.pokemonCard.id = :cardId", { cardId })
      .andWhere("(listing.expiresAt IS NULL OR listing.expiresAt > :now)", {
        now: new Date(),
      })
      .andWhere("listing.quantityAvailable > 0");

    if (currency) {
      statsQb.andWhere("listing.currency = :currency", { currency });
    }
    if (cardState) {
      statsQb.andWhere("listing.cardState = :cardState", { cardState });
    }

    const stats = await statsQb.getRawOne();
    const totalListings = parseInt(stats.totalListings, 10) || 0;

    if (totalListings === 0) {
      const marketPricing = (await marketPricingPromise) ?? card?.pricing ?? null;
      return {
        cardId,
        totalListings: 0,
        minPrice: null,
        maxPrice: null,
        avgPrice: null,
        currency: currency || null,
        priceHistory: [],
        marketPricing,
      };
    }

    const minPrice = parseFloat(stats.minPrice);
    const maxPrice = parseFloat(stats.maxPrice);
    const avgPrice = parseFloat(stats.avgPrice);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const priceHistoryWhere: FindOptionsWhere<PriceHistory> = {
      pokemonCard: { id: cardId },
      recordedAt: MoreThan(ninetyDaysAgo),
    };

    if (currency) {
      priceHistoryWhere.currency = currency as any;
    }
    if (cardState) {
      priceHistoryWhere.cardState = cardState as any;
    }

    const priceHistory = await this.priceHistoryRepository.find({
      where: priceHistoryWhere,
      order: { recordedAt: "ASC" },
      take: 100,
    });

    const marketPricing = (await marketPricingPromise) ?? card?.pricing ?? null;

    return {
      cardId,
      totalListings,
      minPrice,
      maxPrice,
      avgPrice: Math.round(avgPrice * 100) / 100,
      currency: currency || null,
      priceHistory: priceHistory.map((h) => ({
        price: parseFloat(h.price.toString()),
        currency: h.currency,
        recordedAt: h.recordedAt,
      })),
      marketPricing,
    };
  }

  async getPopularCards(limit: number = 10) {
    //TODO : refacto ?
    const cards = await this.listingRepository
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.pokemonCard", "pokemonCard")
      .leftJoinAndSelect("pokemonCard.set", "set")
      .leftJoinAndSelect("set.serie", "serie")
      .select([
        "pokemonCard.id",
        "pokemonCard.name",
        "pokemonCard.image",
        "pokemonCard.localId",
        "pokemonCard.rarity",
        "set.name",
        "set.logo",
        "serie.name",
      ])
      .addSelect("COUNT(listing.id)", "listing_count")
      .addSelect("MIN(listing.price)", "min_price")
      .addSelect("AVG(listing.price)", "avg_price")
      .groupBy("pokemonCard.id")
      .addGroupBy("pokemonCard.name")
      .addGroupBy("pokemonCard.image")
      .addGroupBy("pokemonCard.rarity")
      .addGroupBy("pokemonCard.localId")
      .addGroupBy("set.name")
      .addGroupBy("set.logo")
      .addGroupBy("serie.name")
      .orderBy("listing_count", "DESC")
      .limit(limit)
      .getRawMany();

    return cards.map((card) => ({
      card: {
        id: card.pokemonCard_id,
        name: card.pokemonCard_name,
        image: card.pokemonCard_image,
        localId: card.pokemonCard_localId || card.pokemonCard_localid,
        rarity: card.pokemonCard_rarity,
        set: {
          name: card.set_name,
          logo: card.set_logo,
          serie: { name: card.serie_name },
        },
      },
      listingCount: parseInt(String(card.listing_count), 10) || 0,
      minPrice: parseFloat(String(card.min_price)) || 0,
      avgPrice: parseFloat(String(card.avg_price)) || 0,
    }));
  }

  async getTrendingCards(limit: number = 10, days: number = 7) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const cards = await this.listingRepository
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.pokemonCard", "pokemonCard")
      .leftJoinAndSelect("pokemonCard.set", "set")
      .leftJoinAndSelect("set.serie", "serie")
      .where("listing.createdAt >= :daysAgo", { daysAgo })
      .select([
        "pokemonCard.id",
        "pokemonCard.name",
        "pokemonCard.image",
        "pokemonCard.localId",
        "pokemonCard.rarity",
        "set.name",
        "set.logo",
        "serie.name",
      ])
      .addSelect("COUNT(listing.id)", "recent_listing_count")
      .addSelect("MIN(listing.price)", "min_price")
      .groupBy("pokemonCard.id")
      .addGroupBy("pokemonCard.name")
      .addGroupBy("pokemonCard.image")
      .addGroupBy("pokemonCard.rarity")
      .addGroupBy("pokemonCard.localId")
      .addGroupBy("set.name")
      .addGroupBy("set.logo")
      .addGroupBy("serie.name")
      .orderBy("recent_listing_count", "DESC")
      .limit(limit)
      .getRawMany();

    return cards.map((card) => ({
      card: {
        id: card.pokemonCard_id,
        name: card.pokemonCard_name,
        image: card.pokemonCard_image,
        localId: card.pokemonCard_localId || card.pokemonCard_localid,
        rarity: card.pokemonCard_rarity,
        set: {
          name: card.set_name,
          logo: card.set_logo,
          serie: { name: card.serie_name },
        },
      },
      recentListingCount: parseInt(String(card.recent_listing_count), 10) || 0,
      minPrice: parseFloat(String(card.min_price)) || 0,
    }));
  }

  async getBestSellers(limit: number = 10) {
    const sellersFromOrders = await this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.buyer", "buyer")
      .leftJoin("order.orderItems", "orderItem")
      .leftJoin("orderItem.listing", "listing")
      .leftJoin("listing.seller", "seller")
      .select([
        "seller.id",
        "seller.firstName",
        "seller.lastName",
        "seller.avatarUrl",
        "seller.isPro",
      ])
      .addSelect("COUNT(DISTINCT order.id)", "total_sales")
      .addSelect("SUM(order.totalAmount)", "total_revenue")
      .where("order.status IN (:...statuses)", {
        statuses: ["Paid", "Shipped"],
      })
      .groupBy("seller.id")
      .addGroupBy("seller.firstName")
      .addGroupBy("seller.lastName")
      .addGroupBy("seller.avatarUrl")
      .addGroupBy("seller.isPro")
      .orderBy("total_sales", "DESC")
      .limit(limit)
      .getRawMany();

    if (sellersFromOrders.length >= limit) {
      return sellersFromOrders.map((seller) => ({
        seller: {
          id: seller.seller_id,
          firstName: seller.seller_firstName,
          lastName: seller.seller_lastName,
          avatarUrl: seller.seller_avatarUrl,
          isPro: seller.seller_isPro,
        },
        totalSales: parseInt(String(seller.total_sales), 10) || 0,
        totalRevenue: parseFloat(String(seller.total_revenue)) || 0,
      }));
    }

    const sellersFromListings = await this.listingRepository
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.seller", "seller")
      .select([
        "seller.id",
        "seller.firstName",
        "seller.lastName",
        "seller.avatarUrl",
        "seller.isPro",
      ])
      .addSelect("COUNT(listing.id)", "active_listings")
      .addSelect("SUM(listing.price)", "total_listing_value")
      .where("(listing.expiresAt IS NULL OR listing.expiresAt > :now)", {
        now: new Date(),
      })
      .andWhere("listing.quantityAvailable > 0")
      .groupBy("seller.id")
      .addGroupBy("seller.firstName")
      .addGroupBy("seller.lastName")
      .addGroupBy("seller.avatarUrl")
      .addGroupBy("seller.isPro")
      .orderBy("active_listings", "DESC")
      .limit(limit)
      .getRawMany();

    const sellerIdsFromOrders = new Set(
      sellersFromOrders.map((s: { seller_id: number }) => s.seller_id),
    );

    const sellersFromListingsFiltered = sellersFromListings.filter(
      (s: { seller_id: number }) => !sellerIdsFromOrders.has(s.seller_id),
    );

    const allSellers = [
      ...sellersFromOrders.map((seller) => ({
        seller: {
          id: seller.seller_id,
          firstName: seller.seller_firstName,
          lastName: seller.seller_lastName,
          avatarUrl: seller.seller_avatarUrl,
          isPro: seller.seller_isPro,
        },
        totalSales: parseInt(String(seller.total_sales), 10) || 0,
        totalRevenue: parseFloat(String(seller.total_revenue)) || 0,
      })),
      ...sellersFromListingsFiltered.map((seller) => ({
        seller: {
          id: seller.seller_id,
          firstName: seller.seller_firstName,
          lastName: seller.seller_lastName,
          avatarUrl: seller.seller_avatarUrl,
          isPro: seller.seller_isPro,
        },
        totalSales: 0,
        totalRevenue: parseFloat(String(seller.total_listing_value)) || 0,
      })),
    ].slice(0, limit);

    return allSellers;
  }

  async getSellerStatistics(sellerId: number) {
    const seller = await this.userRepository.findOne({
      where: { id: sellerId },
      select: [
        "id",
        "firstName",
        "lastName",
        "email",
        "avatarUrl",
        "isPro",
        "createdAt",
      ],
    });

    if (!seller) {
      throw new NotFoundException(`Seller with id ${sellerId} not found`);
    }

    const listings = await this.listingRepository.find({
      where: { seller: { id: sellerId } },
      relations: [
        "seller",
        "pokemonCard",
        "pokemonCard.set",
        "pokemonCard.set.serie",
      ],
      order: { createdAt: "DESC" },
    });

    const orders = await this.orderRepository
      .createQueryBuilder("order")
      .leftJoin("order.orderItems", "orderItem")
      .leftJoin("orderItem.listing", "listing")
      .where("listing.seller.id = :sellerId", { sellerId })
      .andWhere("order.status IN (:...statuses)", {
        statuses: ["Paid", "Shipped"],
      })
      .getMany();

    const totalRevenue = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount.toString()),
      0,
    );
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    return {
      sellerId,
      seller,
      totalListings: listings.length,
      activeListings: listings.filter(
        (l) => !l.expiresAt || new Date(l.expiresAt) > new Date(),
      ).length,
      totalSales: orders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      listings: listings.slice(0, 20), // Return recent listings
    };
  }

  async recordPriceHistory(listing: Listing): Promise<void> {
    if (!listing.pokemonCard && !listing.sealedProduct) return;
    const priceHistory = this.priceHistoryRepository.create({
      pokemonCard: listing.pokemonCard ?? null,
      sealedProduct: listing.sealedProduct ?? null,
      price: listing.price,
      currency: listing.currency,
      cardState: listing.cardState ?? undefined,
      sealedCondition: listing.sealedCondition ?? undefined,
      quantityAvailable: listing.quantityAvailable,
    });
    await this.priceHistoryRepository.save(priceHistory);
  }

  async getCardsWithMarketplaceData(params: {
    page?: number;
    limit?: number;
    search?: string;
    setId?: string;
    serieId?: string;
    rarity?: string;
    currency?: string;
    cardState?: string;
    priceMin?: number;
    priceMax?: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  }): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 20,
      search,
      setId,
      serieId,
      rarity,
      currency,
      cardState,
      priceMin,
      priceMax,
      sortBy = "localId",
      sortOrder = "ASC",
    } = params;

    const qb = this.pokemonCardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("set.serie", "serie")
      .leftJoin(
        Listing,
        "listing",
        "listing.pokemonCard.id = card.id AND (listing.expiresAt IS NULL OR listing.expiresAt > :now) AND listing.quantityAvailable > 0",
        { now: new Date() },
      )
      .select([
        "card.id",
        "card.name",
        "card.image",
        "card.rarity",
        "card.localId",
        "card.pricing",
        "set.id",
        "set.name",
        "set.logo",
        "set.symbol",
        "serie.id",
        "serie.name",
      ])
      .addSelect("COUNT(DISTINCT listing.id)", "listing_count")
      .addSelect("MIN(listing.price)", "min_price")
      .addSelect("AVG(listing.price)", "avg_price")
      .groupBy("card.id")
      .addGroupBy("card.name")
      .addGroupBy("card.image")
      .addGroupBy("card.rarity")
      .addGroupBy("card.localId")
      .addGroupBy("card.pricing")
      .addGroupBy("set.id")
      .addGroupBy("set.name")
      .addGroupBy("set.logo")
      .addGroupBy("set.symbol")
      .addGroupBy("serie.id")
      .addGroupBy("serie.name");

    if (search) {
      qb.andWhere("card.name ILIKE :search", { search: `%${search}%` });
    }
    if (setId) {
      qb.andWhere("set.id = :setId", { setId });
    }
    if (serieId) {
      qb.andWhere("serie.id = :serieId", { serieId });
    }
    if (rarity) {
      qb.andWhere("card.rarity = :rarity", { rarity });
    }
    if (currency) {
      qb.andWhere("(listing.currency = :currency OR listing.id IS NULL)", {
        currency,
      });
    }
    if (cardState) {
      qb.andWhere("(listing.cardState = :cardState OR listing.id IS NULL)", {
        cardState,
      });
    }
    if (typeof priceMin === "number") {
      qb.having("MIN(listing.price) >= :priceMin OR COUNT(listing.id) = 0", {
        priceMin,
      });
    }
    if (typeof priceMax === "number") {
      qb.having("MIN(listing.price) <= :priceMax OR COUNT(listing.id) = 0", {
        priceMax,
      });
    }

    //TODO : refacto pour éviter les répétitions et gérer plus proprement les champs calculés
    if (sortBy === "price") {
      qb.orderBy("min_price", sortOrder);
    } else if (sortBy === "popularity") {
      qb.orderBy("listing_count", "DESC");
    } else if (sortBy === "localId") {
      qb.orderBy("card.localId", sortOrder);
      qb.addOrderBy("card.name", "ASC");
    } else if (sortBy === "name" || sortBy === "rarity") {
      qb.orderBy(`card.${sortBy}`, sortOrder);
    } else {
      qb.orderBy("card.name", sortOrder);
    }

    return PaginationHelper.paginateQueryBuilder(qb, { page, limit });
  }

  async findOrdersByBuyerId(buyerId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { buyer: { id: buyerId } },
      relations: [
        "orderItems",
        "orderItems.listing",
        "orderItems.listing.pokemonCard",
        "payments",
      ],
      order: { createdAt: "DESC" },
    });
  }

  async findOrderById(id: number, userId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        "buyer",
        "orderItems",
        "orderItems.listing",
        "orderItems.listing.pokemonCard",
        "payments",
      ],
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
      relations: [
        "buyer",
        "orderItems",
        "orderItems.listing",
        "orderItems.listing.seller",
        "orderItems.listing.pokemonCard",
        "payments",
      ],
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    return order;
  }

  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    const order = await this.findOrderByIdAsAdmin(id);
    order.status = status;
    return this.orderRepository.save(order);
  }

  async handlePaymentSucceeded(paymentIntentId: string): Promise<void> {
    const payment = await this.paymentTransactionRepository.findOne({
      where: { transactionId: paymentIntentId },
      relations: ["order"],
    });

    if (!payment) {
      this.logger.warn(
        `No payment transaction found for PaymentIntent ${paymentIntentId}`,
      );
      return;
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      payment.status = PaymentStatus.COMPLETED;
      await this.paymentTransactionRepository.save(payment);
    }

    if (payment.order && payment.order.status === OrderStatus.PENDING) {
      payment.order.status = OrderStatus.PAID;
      await this.orderRepository.save(payment.order);
    }
  }

  async handlePaymentFailed(paymentIntentId: string): Promise<void> {
    const payment = await this.paymentTransactionRepository.findOne({
      where: { transactionId: paymentIntentId },
      relations: ["order", "order.orderItems", "order.orderItems.listing"],
    });

    if (!payment) {
      this.logger.warn(
        `No payment transaction found for failed PaymentIntent ${paymentIntentId}`,
      );
      return;
    }

    payment.status = PaymentStatus.FAILED;
    await this.paymentTransactionRepository.save(payment);

    if (payment.order) {
      payment.order.status = OrderStatus.CANCELLED;
      await this.orderRepository.save(payment.order);

      await this.restoreOrderStock(payment.order);
    }
  }

  async handlePaymentRefunded(paymentIntentId: string): Promise<void> {
    const payment = await this.paymentTransactionRepository.findOne({
      where: { transactionId: paymentIntentId },
      relations: ["order", "order.orderItems", "order.orderItems.listing"],
    });

    if (!payment) {
      this.logger.warn(
        `No payment transaction found for refunded PaymentIntent ${paymentIntentId}`,
      );
      return;
    }

    payment.status = PaymentStatus.REFUNDED;
    await this.paymentTransactionRepository.save(payment);

    if (payment.order) {
      payment.order.status = OrderStatus.REFUNDED;
      await this.orderRepository.save(payment.order);

      await this.restoreOrderStock(payment.order);
    }
  }

  private async restoreOrderStock(order: Order): Promise<void> {
    if (!order.orderItems) return;

    for (const item of order.orderItems) {
      if (item.listing) {
        await this.listingRepository.increment(
          { id: item.listing.id },
          "quantityAvailable",
          item.quantity,
        );
      }
    }
  }
}
