import {
  applyRarityFilter,
  cardNameMatchesSql,
  localizedNameSql,
  localizedSealedNameSql,
  sealedProductNameMatchesSql,
  serieNameMatchesSql,
  setNameMatchesSql,
} from "src/card/card-search";
import { DEFAULT_LOCALE } from "src/translation/supported-locales";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserRole } from "src/common/enums/user";
import { FindOptionsWhere, MoreThan, Repository } from "typeorm";
import { Card } from "../card/entities/card.entity";
import { Currency } from "../common/enums/currency";
import { Languages } from "../common/enums/languages";
import { ListingStatus } from "../common/enums/listing-status";
import { ProductKind } from "../common/enums/product-kind";
import {
  normalizeSortOrder,
  PaginatedResult,
  PaginationHelper,
} from "../helpers/pagination";
import {
  ListingSortBy,
  ListingSortOrder,
} from "./dto/ind-all-listings-query.dto";
import { SealedProduct } from "../sealed-product/entities/sealed-product.entity";
import { User } from "../user/entities/user.entity";
import { CreateListingDto } from "./dto/create-marketplace.dto";
import { UpdateListingDto } from "./dto/update-marketplace.dto";
import { Listing } from "./entities/listing.entity";
import { OrderStatus } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { PriceHistory } from "./entities/price-history.entity";
import { OrderService } from "./order.service";
import { getMarketReferencePrice, round2 } from "./price.helper";
import { getShippingCost, SHIPPING_POLICY } from "./shipping-policy";

// TypeORM injecte l'expression orderBy telle quelle : jamais la construire à
// partir de l'entrée utilisateur. `name` trie sur un alias localisé calculé.
const LISTING_SORT_COLUMNS: Record<
  Exclude<ListingSortBy, ListingSortBy.NAME>,
  string
> = {
  [ListingSortBy.CREATED_AT]: "listing.createdAt",
  [ListingSortBy.PRICE]: "listing.price",
  [ListingSortBy.EXPIRES_AT]: "listing.expiresAt",
  [ListingSortBy.QUANTITY_AVAILABLE]: "listing.quantityAvailable",
};

const resolveListingSortColumn = (sortBy?: ListingSortBy): string =>
  LISTING_SORT_COLUMNS[sortBy as Exclude<ListingSortBy, ListingSortBy.NAME>] ??
  LISTING_SORT_COLUMNS[ListingSortBy.CREATED_AT];

export interface FindAllListingsParams {
  sellerId?: number;
  pokemonCardId?: string;
  sealedProductId?: string;
  productKind?: ProductKind;
  page?: number;
  limit?: number;
  sortBy?: ListingSortBy;
  sortOrder?: ListingSortOrder;
  search?: string;
  cardState?: string;
  language?: Languages;
  status?: ListingStatus;
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
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly orderService: OrderService,
  ) {}

  private readonly logger = new Logger(MarketplaceService.name);

  async create(createListingDto: CreateListingDto, user: User) {
    const productKind = createListingDto.productKind ?? ProductKind.CARD;

    if (productKind === ProductKind.CARD) {
      if (!createListingDto.pokemonCardId) {
        throw new BadRequestException(
          "pokemonCardId est obligatoire pour une annonce de carte",
        );
      }
      if (!createListingDto.cardState) {
        throw new BadRequestException(
          "L'état de la carte est obligatoire pour une annonce de carte",
        );
      }
    } else {
      if (!createListingDto.sealedProductId) {
        throw new BadRequestException(
          "sealedProductId est obligatoire pour une annonce de produit scellé",
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
      // Platform-enforced shipping cost and handling delay (never set directly by seller)
      shippingCost: getShippingCost(productKind),
      handlingTimeDays: SHIPPING_POLICY.handlingTimeDays,
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
      sortBy = ListingSortBy.CREATED_AT,
      sortOrder = ListingSortOrder.DESC,
      search,
      cardState,
      language,
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
      .andWhere("listing.quantityAvailable > 0")
      .andWhere("listing.status = :activeStatus", {
        activeStatus: ListingStatus.ACTIVE,
      });

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
    if (language) {
      qb.andWhere("listing.language = :language", { language });
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
          ${cardNameMatchesSql("pokemonCard")}
          OR LOWER(seller.firstName) LIKE :search
          OR LOWER(seller.lastName) LIKE :search
          OR ${setNameMatchesSql("set")}
          OR ${serieNameMatchesSql("serie")}
          OR LOWER(listing.description) LIKE :search
        )`,
        { search: `%${search.toLowerCase()}%` },
      );
    }
    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      resolveListingSortColumn(sortBy),
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
    if (!listing) throw new NotFoundException("Annonce introuvable");
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
    if (!listing) throw new NotFoundException("Annonce introuvable");
    if (listing.seller.id !== user.id && user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `Refus update listing: user=${user.id} role=${user.role} targetListing=${id} seller=${listing.seller.id}`,
      );
      throw new ForbiddenException("Vous ne pouvez pas modifier cette annonce");
    }
    const previousPrice = Number(listing.price);
    const previousCurrency = listing.currency;

    Object.assign(listing, updateListingDto);
    const saved = await this.listingRepository.save(listing);

    const priceChanged =
      Number(saved.price) !== previousPrice ||
      saved.currency !== previousCurrency;

    if (priceChanged) {
      const withRelations = await this.findOne(saved.id);
      await this.recordPriceHistory(withRelations);
    }

    return saved;
  }

  async delete(id: number, user: User): Promise<void> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ["seller"],
    });
    if (!listing) throw new NotFoundException("Annonce introuvable");
    if (listing.seller.id !== user.id && user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `Refus delete listing: user=${user.id} role=${user.role} targetListing=${id} seller=${listing.seller.id}`,
      );
      throw new ForbiddenException(
        "Vous ne pouvez pas supprimer cette annonce",
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
      sortBy = ListingSortBy.CREATED_AT,
      sortOrder = ListingSortOrder.DESC,
      search,
      cardState,
      language,
      status,
      currency,
      productKind,
    } = params;

    const qb = this.listingRepository
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.seller", "seller")
      .leftJoinAndSelect("listing.pokemonCard", "pokemonCard")
      .leftJoinAndSelect("pokemonCard.set", "set")
      .leftJoinAndSelect("set.serie", "serie")
      .leftJoinAndSelect("listing.sealedProduct", "sealedProduct")
      .leftJoinAndSelect("sealedProduct.pokemonSet", "sealedSet")
      .where("seller.id = :sellerId", { sellerId });

    if (search) {
      qb.andWhere(
        `(${cardNameMatchesSql("pokemonCard")}
          OR ${setNameMatchesSql("set")}
          OR ${setNameMatchesSql("sealedSet")}
          OR ${sealedProductNameMatchesSql("sealedProduct")})`,
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (cardState) {
      qb.andWhere("listing.cardState = :cardState", { cardState });
    }

    if (language) {
      qb.andWhere("listing.language = :language", { language });
    }

    if (status) {
      qb.andWhere("listing.status = :status", { status });
    }

    if (currency) {
      qb.andWhere("listing.currency = :currency", { currency });
    }

    if (productKind) {
      qb.andWhere("listing.productKind = :productKind", { productKind });
    }

    const safeSortOrder = normalizeSortOrder(sortOrder);

    if (sortBy === ListingSortBy.NAME) {
      // Name originates from localized translations: sorting defaults to default locale
      qb.addSelect(
        `COALESCE(
          ${localizedNameSql("pokemonCard")},
          ${localizedSealedNameSql("sealedProduct")}
        )`,
        "product_name",
      );
      qb.setParameter("sortLocale", DEFAULT_LOCALE);
      qb.orderBy("product_name", safeSortOrder);
    } else {
      qb.orderBy(resolveListingSortColumn(sortBy), safeSortOrder);
    }

    return PaginationHelper.paginateQueryBuilder(qb, { page, limit });
  }

  /**
   * Calculates card marketplace statistics (active listings, price range, average price) for a target currency.
   *
   * @param cardId Target card ID.
   * @param currency Preferred currency.
   * @param cardState Filter by card state.
   */
  async getCardStatistics(
    cardId: string,
    currency?: string,
    cardState?: string,
  ) {
    // Fetch card market pricing
    const card = await this.pokemonCardRepository.findOne({
      where: { id: cardId },
      select: ["id", "pricing"],
    });

    const emptyStats = (statsCurrency: string | null) => ({
      cardId,
      totalListings: 0,
      minPrice: null,
      maxPrice: null,
      avgPrice: null,
      currency: statsCurrency,
      availableCurrencies: [] as string[],
      priceHistory: [],
      marketPricing: card?.pricing || null,
    });

    const baseQuery = () => {
      const qb = this.listingRepository
        .createQueryBuilder("listing")
        .where("listing.pokemonCard.id = :cardId", { cardId })
        .andWhere("(listing.expiresAt IS NULL OR listing.expiresAt > :now)", {
          now: new Date(),
        })
        .andWhere("listing.quantityAvailable > 0")
        .andWhere("listing.status = :activeStatus", {
          activeStatus: ListingStatus.ACTIVE,
        });
      if (cardState) {
        qb.andWhere("listing.cardState = :cardState", { cardState });
      }
      return qb;
    };

    const currencyRows = await baseQuery()
      .select("listing.currency", "currency")
      .addSelect("COUNT(listing.id)", "count")
      .groupBy("listing.currency")
      .orderBy("count", "DESC")
      .getRawMany();

    const availableCurrencies = currencyRows.map((row) => String(row.currency));

    if (availableCurrencies.length === 0) {
      return emptyStats(currency || null);
    }

    const statsCurrency = currency ?? availableCurrencies[0];
    if (!availableCurrencies.includes(statsCurrency)) {
      return { ...emptyStats(statsCurrency), availableCurrencies };
    }

    const stats = await baseQuery()
      .andWhere("listing.currency = :statsCurrency", { statsCurrency })
      .select("COUNT(listing.id)", "totalListings")
      .addSelect("MIN(listing.price)", "minPrice")
      .addSelect("MAX(listing.price)", "maxPrice")
      .addSelect("AVG(listing.price)", "avgPrice")
      .getRawOne();

    const totalListings = parseInt(stats.totalListings, 10) || 0;

    if (totalListings === 0) {
      return { ...emptyStats(statsCurrency), availableCurrencies };
    }

    const minPrice = parseFloat(stats.minPrice);
    const maxPrice = parseFloat(stats.maxPrice);
    const avgPrice = parseFloat(stats.avgPrice);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const priceHistoryWhere: FindOptionsWhere<PriceHistory> = {
      pokemonCard: { id: cardId },
      recordedAt: MoreThan(ninetyDaysAgo),
      currency: statsCurrency as any,
    };

    if (cardState) {
      priceHistoryWhere.cardState = cardState as any;
    }

    const priceHistory = await this.priceHistoryRepository.find({
      where: priceHistoryWhere,
      order: { recordedAt: "ASC" },
      take: 100,
    });

    return {
      cardId,
      totalListings,
      minPrice,
      maxPrice,
      avgPrice: Math.round(avgPrice * 100) / 100,
      currency: statsCurrency,
      availableCurrencies,
      priceHistory: priceHistory.map((h) => ({
        price: parseFloat(h.price.toString()),
        currency: h.currency,
        recordedAt: h.recordedAt,
      })),
      marketPricing: card?.pricing || null,
    };
  }

  /**
   * Calculates suggested listing price for sellers based on active marketplace listings and external market data.
   *
   * @param cardId Target card ID.
   * @param cardState Card condition state code.
   * @param currency Desired currency.
   */
  async getPriceSuggestion(
    cardId: string,
    cardState?: string,
    currency: string = Currency.EUR,
  ) {
    const card = await this.pokemonCardRepository.findOne({
      where: { id: cardId },
      select: ["id", "pricing"],
    });
    if (!card) throw new NotFoundException("Carte introuvable");

    const sameState = cardState
      ? await this.aggregateActiveListingPrices(cardId, currency, cardState)
      : null;
    const allStates = await this.aggregateActiveListingPrices(cardId, currency);
    const marketPrice = getMarketReferencePrice(card.pricing, currency);

    const listings = sameState && sameState.count > 0 ? sameState : allStates;
    const basis =
      sameState && sameState.count > 0
        ? "same-state"
        : allStates.count > 0
          ? "all-states"
          : marketPrice !== null
            ? "market"
            : null;

    const suggestedPrice =
      basis === "market" ? marketPrice : basis ? listings.avgPrice : null;

    return {
      cardId,
      cardState: cardState ?? null,
      currency,
      basis,
      suggestedPrice,
      listings,
      marketPrice,
    };
  }

  /** Calculates aggregated price stats for active listings of a card. */
  private async aggregateActiveListingPrices(
    cardId: string,
    currency: string,
    cardState?: string,
  ) {
    const qb = this.listingRepository
      .createQueryBuilder("listing")
      .where("listing.pokemonCard.id = :cardId", { cardId })
      .andWhere("listing.currency = :currency", { currency })
      .andWhere("listing.status = :activeStatus", {
        activeStatus: ListingStatus.ACTIVE,
      })
      .andWhere("listing.quantityAvailable > 0")
      .andWhere("(listing.expiresAt IS NULL OR listing.expiresAt > :now)", {
        now: new Date(),
      });

    if (cardState) {
      qb.andWhere("listing.cardState = :cardState", { cardState });
    }

    const raw = await qb
      .select("COUNT(listing.id)", "count")
      .addSelect("MIN(listing.price)", "minPrice")
      .addSelect("MAX(listing.price)", "maxPrice")
      .addSelect("AVG(listing.price)", "avgPrice")
      .getRawOne();

    const count = parseInt(raw?.count, 10) || 0;
    if (count === 0) {
      return { count: 0, minPrice: null, maxPrice: null, avgPrice: null };
    }

    return {
      count,
      minPrice: round2(parseFloat(raw.minPrice)),
      maxPrice: round2(parseFloat(raw.maxPrice)),
      avgPrice: round2(parseFloat(raw.avgPrice)),
    };
  }

  /**
   * Get popular cards (most listed/viewed)
   */
  async getPopularCards(limit: number = 10) {
    const cards = await this.listingRepository
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.pokemonCard", "pokemonCard")
      .leftJoinAndSelect("pokemonCard.set", "set")
      .leftJoinAndSelect("set.serie", "serie")
      // Labels attached by `CatalogLocalizationInterceptor` from IDs: selecting them here is unneeded.
      .select([
        "pokemonCard.id",
        "pokemonCard.tcgDexId",
        "pokemonCard.localId",
        "set.id",
        "serie.id",
      ])
      .addSelect("COUNT(listing.id)", "listing_count")
      .addSelect("MIN(listing.price)", "min_price")
      .addSelect("AVG(listing.price)", "avg_price")
      .groupBy("pokemonCard.id")
      .addGroupBy("pokemonCard.tcgDexId")
      .addGroupBy("pokemonCard.localId")
      .addGroupBy("set.id")
      .addGroupBy("serie.id")
      .orderBy("listing_count", "DESC")
      .limit(limit)
      .getRawMany();

    return cards.map((card) => ({
      card: {
        id: card.pokemonCard_id,
        tcgDexId: card.pokemonCard_tcgDexId || card.pokemonCard_tcgdexid,
        localId: card.pokemonCard_localId || card.pokemonCard_localid,
        set: {
          id: card.set_id,
          serie: { id: card.serie_id },
        },
      },
      listingCount: parseInt(String(card.listing_count), 10) || 0,
      minPrice: parseFloat(String(card.min_price)) || 0,
      avgPrice: parseFloat(String(card.avg_price)) || 0,
    }));
  }

  /**
   * Get trending cards (based on recent listings)
   */
  async getTrendingCards(limit: number = 10, days: number = 7) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const cards = await this.listingRepository
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.pokemonCard", "pokemonCard")
      .leftJoinAndSelect("pokemonCard.set", "set")
      .leftJoinAndSelect("set.serie", "serie")
      .where("listing.createdAt >= :daysAgo", { daysAgo })
      // Labels attached by `CatalogLocalizationInterceptor` from IDs: selecting them here is unneeded.
      .select([
        "pokemonCard.id",
        "pokemonCard.tcgDexId",
        "pokemonCard.localId",
        "set.id",
        "serie.id",
      ])
      .addSelect("COUNT(listing.id)", "recent_listing_count")
      .addSelect("MIN(listing.price)", "min_price")
      .groupBy("pokemonCard.id")
      .addGroupBy("pokemonCard.tcgDexId")
      .addGroupBy("pokemonCard.localId")
      .addGroupBy("set.id")
      .addGroupBy("serie.id")
      .orderBy("recent_listing_count", "DESC")
      .limit(limit)
      .getRawMany();

    return cards.map((card) => ({
      card: {
        id: card.pokemonCard_id,
        tcgDexId: card.pokemonCard_tcgDexId || card.pokemonCard_tcgdexid,
        localId: card.pokemonCard_localId || card.pokemonCard_localid,
        set: {
          id: card.set_id,
          serie: { id: card.serie_id },
        },
      },
      recentListingCount: parseInt(String(card.recent_listing_count), 10) || 0,
      minPrice: parseFloat(String(card.min_price)) || 0,
    }));
  }

  /**
   * Get best sellers (users with most sales)
   * Falls back to sellers with most active listings if no sales found
   */
  async getBestSellers(limit: number = 10) {
    const sellersFromOrders = await this.orderItemRepository
      .createQueryBuilder("orderItem")
      .leftJoin("orderItem.order", "order")
      .leftJoin("orderItem.seller", "seller")
      .select([
        "seller.id",
        "seller.firstName",
        "seller.lastName",
        "seller.avatarUrl",
        "seller.isPro",
      ])
      .addSelect("COUNT(DISTINCT order.id)", "total_sales")
      .addSelect(
        "SUM(orderItem.unitPrice * orderItem.quantity)",
        "total_revenue",
      )
      .addSelect("order.currency", "currency")
      .where("order.status IN (:...statuses)", {
        statuses: [
          OrderStatus.PAID,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
        ],
      })
      .andWhere("seller.id IS NOT NULL")
      .groupBy("seller.id")
      .addGroupBy("seller.firstName")
      .addGroupBy("seller.lastName")
      .addGroupBy("seller.avatarUrl")
      .addGroupBy("seller.isPro")
      .addGroupBy("order.currency")
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
        currency: seller.currency ?? null,
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
      .andWhere("listing.status = :activeStatus", {
        activeStatus: ListingStatus.ACTIVE,
      })
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
        currency: seller.currency ?? null,
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
        totalRevenue: 0,
        activeListings: parseInt(String(seller.active_listings), 10) || 0,
        currency: null,
      })),
    ].slice(0, limit);

    return allSellers;
  }

  /**
   * Get seller statistics
   */
  async getSellerStatistics(sellerId: number) {
    const seller = await this.userRepository.findOne({
      where: { id: sellerId },
      select: [
        "id",
        "firstName",
        "lastName",
        "avatarUrl",
        "isPro",
        "createdAt",
      ],
    });

    if (!seller) {
      throw new NotFoundException(`Vendeur ${sellerId} introuvable`);
    }

    const listings = await this.listingRepository.find({
      where: { seller: { id: sellerId } },
      relations: [
        "seller",
        "pokemonCard",
        "pokemonCard.set",
        "pokemonCard.set.serie",
        "sealedProduct",
        "sealedProduct.pokemonSet",
      ],
      order: { createdAt: "DESC" },
    });

    const { totalSales, revenueByCurrency } =
      await this.orderService.getSellerRevenue(sellerId);

    const currencies = Object.keys(revenueByCurrency);
    const primaryCurrency = currencies.length === 1 ? currencies[0] : null;
    const totalRevenue = primaryCurrency
      ? revenueByCurrency[primaryCurrency]
      : null;

    return {
      sellerId,
      seller,
      totalListings: listings.length,
      activeListings: listings.filter(
        (l) =>
          l.status === ListingStatus.ACTIVE &&
          l.quantityAvailable > 0 &&
          (!l.expiresAt || new Date(l.expiresAt) > new Date()),
      ).length,
      totalSales,
      totalRevenue,
      currency: primaryCurrency,
      revenueByCurrency,
      avgOrderValue:
        totalRevenue !== null && totalSales > 0
          ? Math.round((totalRevenue / totalSales) * 100) / 100
          : null,
      listings: listings.slice(0, 20), // Return recent listings
    };
  }

  /**
   * Record price history when listing is created/updated.
   * Supporte les listings card ET sealed (l'un des deux est renseigné).
   */
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

  /**
   * Get all available cards with marketplace data
   */
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
        "listing.pokemonCard.id = card.id AND (listing.expiresAt IS NULL OR listing.expiresAt > :now) AND listing.quantityAvailable > 0 AND listing.status = :activeStatus",
        { now: new Date(), activeStatus: ListingStatus.ACTIVE },
      )
      // Labels are applied by `CatalogLocalizationInterceptor` from the
      // identifiers: selecting them here is neither possible nor needed.
      .select([
        "card.id",
        "card.tcgDexId",
        "card.localId",
        "card.pricing",
        "set.id",
        "serie.id",
      ])
      .addSelect("COUNT(DISTINCT listing.id)", "listing_count")
      .addSelect("MIN(listing.price)", "min_price")
      .addSelect("AVG(listing.price)", "avg_price")
      // Joined on a single locale, so it stays one-to-one and can safely take
      // part in the grouping and ordering.
      .leftJoin(
        "card.translations",
        "sortTranslation",
        "sortTranslation.locale = :sortLocale",
        { sortLocale: DEFAULT_LOCALE },
      )
      .groupBy("card.id")
      .addGroupBy("card.tcgDexId")
      .addGroupBy("card.localId")
      .addGroupBy("card.pricing")
      .addGroupBy("set.id")
      .addGroupBy("serie.id")
      .addGroupBy("sortTranslation.name")
      .addGroupBy("sortTranslation.rarity");

    if (search) {
      qb.andWhere(cardNameMatchesSql("card"), {
        search: `%${search.toLowerCase()}%`,
      });
    }
    if (setId) {
      qb.andWhere("set.id = :setId", { setId });
    }
    if (serieId) {
      qb.andWhere("serie.id = :serieId", { serieId });
    }
    if (rarity) {
      applyRarityFilter(qb, rarity);
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
      qb.having("MIN(listing.price) >= :priceMin", { priceMin });
    }
    if (typeof priceMax === "number") {
      qb.andHaving("MIN(listing.price) <= :priceMax", { priceMax });
    }

    // Sorting with safeguards
    const safeSortOrder = normalizeSortOrder(sortOrder);

    if (sortBy === "price") {
      qb.orderBy("min_price", safeSortOrder, "NULLS LAST");
    } else if (sortBy === "popularity") {
      qb.orderBy("listing_count", "DESC");
    } else if (sortBy === "localId") {
      // For localId, sort as text but it will work for numeric strings
      // Since we added it to GROUP BY, we can reference it directly
      qb.orderBy("card.localId", safeSortOrder);
      // Add secondary sort by name for consistency
      qb.addOrderBy("sortTranslation.name", "ASC");
    } else if (sortBy === "name" || sortBy === "rarity") {
      // Localized fields, taken from the joined translation
      qb.orderBy(`sortTranslation.${sortBy}`, safeSortOrder);
    } else {
      // Fallback to name if sortBy is not recognized
      qb.orderBy("sortTranslation.name", safeSortOrder);
    }

    const validated = PaginationHelper.validateParams({ page, limit });
    const skip = PaginationHelper.calculateOffset(
      validated.page,
      validated.limit,
    );

    // `offset`/`limit` rather than `skip`/`take`: the latter wraps the query in
    // a DISTINCT subquery that cannot see the joined sort column.
    qb.offset(skip).limit(validated.limit);

    const [total, { entities, raw }] = await Promise.all([
      qb.getCount(),
      qb.getRawAndEntities(),
    ]);

    const mappedData = entities.map((entity, index) => {
      const rawRow = raw[index];
      const row =
        rawRow && rawRow.card_id === entity.id
          ? rawRow
          : raw.find((r) => r.card_id === entity.id);

      return {
        card: entity,
        minPrice: row && row.min_price ? parseFloat(row.min_price) : undefined,
        avgPrice: row && row.avg_price ? parseFloat(row.avg_price) : undefined,
        listingCount:
          row && row.listing_count ? parseInt(row.listing_count, 10) : 0,
      };
    });

    return PaginationHelper.createPaginatedResult(
      mappedData,
      total,
      validated.page,
      validated.limit,
    );
  }
}
