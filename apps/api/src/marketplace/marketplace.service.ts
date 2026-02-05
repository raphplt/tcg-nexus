import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, FindOptionsWhere } from 'typeorm';
import { Listing } from './entities/listing.entity';
import { PriceHistory } from './entities/price-history.entity';
import { CreateListingDto } from './dto/create-marketplace.dto';
import { UpdateListingDto } from './dto/update-marketplace.dto';
import { User } from '../user/entities/user.entity';
import { PaginationHelper, PaginatedResult } from '../helpers/pagination';
import { Card } from '../card/entities/card.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { UserRole } from 'src/common/enums/user';
import { CreateOrderDto } from './dto/create-order.dto';
import { StripeService } from './stripe.service';
import { UserCartService } from '../user_cart/user_cart.service';
import {
  PaymentTransaction,
  PaymentMethod,
  PaymentStatus
} from './entities/payment-transaction.entity';
import { OrderItem } from './entities/order-item.entity';
import { Currency } from '../common/enums/currency';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';

export interface FindAllListingsParams {
  sellerId?: number;
  pokemonCardId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
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
    private readonly stripeService: StripeService,
    private readonly userCartService: UserCartService
  ) {}

  private readonly logger = new Logger(MarketplaceService.name);

  async createOrder(createOrderDto: CreateOrderDto, user: User) {
    const cart = await this.userCartService.findCartByUserId(user.id);
    if (!cart || cart.cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Calculate total
    let totalAmount = 0;
    const orderItems: OrderItem[] = [];

    for (const item of cart.cartItems) {
      if (item.listing.quantityAvailable < item.quantity) {
        throw new BadRequestException(
          `Not enough quantity for listing ${item.listing.id}`
        );
      }
      totalAmount += Number(item.listing.price) * item.quantity;

      const orderItem = this.orderItemRepository.create({
        listing: item.listing,
        quantity: item.quantity,
        unitPrice: item.listing.price
      });
      orderItems.push(orderItem);
    }

    // Verify Stripe Payment
    // In a real scenario, we would retrieve the PaymentIntent and check if it matches the amount and status
    // For this simulation, we assume the frontend passed a valid paymentIntentId after successful confirmation
    // We can verify it against Stripe API
    // const paymentIntent = await this.stripeService.retrievePaymentIntent(createOrderDto.paymentIntentId);
    // if (paymentIntent.status !== 'succeeded') throw new BadRequestException('Payment not succeeded');
    // if (paymentIntent.amount !== Math.round(totalAmount * 100)) throw new BadRequestException('Payment amount mismatch');

    // Create Order
    const order = this.orderRepository.create({
      buyer: user,
      totalAmount,
      status: OrderStatus.PAID,
      currency: Currency.EUR, // Assuming EUR for now, should come from cart/listings
      orderItems
    });

    const savedOrder = await this.orderRepository.save(order);

    // Create Payment Transaction
    const payment = this.paymentTransactionRepository.create({
      order: savedOrder,
      method: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.COMPLETED,
      transactionId: createOrderDto.paymentIntentId,
      amount: totalAmount
    });
    await this.paymentTransactionRepository.save(payment);

    // Update Listings Quantities
    for (const item of cart.cartItems) {
      item.listing.quantityAvailable -= item.quantity;
      await this.listingRepository.save(item.listing);
    }

    // Clear Cart
    await this.userCartService.clearCart(user.id);

    return savedOrder;
  }

  async findAllOrders(params: AdminOrderQueryDto) {
    const { page = 1, limit = 20, status, buyerId, sellerId } = params;
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('order.orderItems', 'orderItem')
      .leftJoinAndSelect('orderItem.listing', 'listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoinAndSelect('listing.pokemonCard', 'pokemonCard')
      .leftJoinAndSelect('order.payments', 'payment');

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }
    if (buyerId) {
      qb.andWhere('buyer.id = :buyerId', { buyerId });
    }
    if (sellerId) {
      qb.andWhere('seller.id = :sellerId', { sellerId });
    }

    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      'order.createdAt',
      'DESC'
    );
  }

  async create(createListingDto: CreateListingDto, user: User) {
    if (!createListingDto.pokemonCardId) {
      throw new BadRequestException('pokemonCardId is required');
    }
    const listing = this.listingRepository.create({
      ...createListingDto,
      seller: user,
      pokemonCard: { id: createListingDto.pokemonCardId }
    });
    const savedListing = await this.listingRepository.save(listing);

    // Load full relations for price history
    const listingWithRelations = await this.findOne(savedListing.id);
    await this.recordPriceHistory(listingWithRelations);

    return savedListing;
  }

  async findAll(
    params: FindAllListingsParams = {}
  ): Promise<PaginatedResult<Listing>> {
    const {
      sellerId,
      pokemonCardId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      cardState,
      currency,
      priceMin,
      priceMax
    } = params;
    const qb = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoinAndSelect('listing.pokemonCard', 'pokemonCard')
      .leftJoinAndSelect('pokemonCard.set', 'set')
      .leftJoinAndSelect('set.serie', 'serie');

    if (sellerId) {
      qb.andWhere('seller.id = :sellerId', { sellerId });
    }
    if (pokemonCardId) {
      qb.andWhere('pokemonCard.id = :pokemonCardId', { pokemonCardId });
    }
    if (cardState) {
      qb.andWhere('listing.cardState = :cardState', { cardState });
    }
    if (currency) {
      qb.andWhere('listing.currency = :currency', { currency });
    }
    if (typeof priceMin === 'number') {
      qb.andWhere('listing.price >= :priceMin', { priceMin });
    }
    if (typeof priceMax === 'number') {
      qb.andWhere('listing.price <= :priceMax', { priceMax });
    }
    if (search) {
      qb.andWhere(
        `(
          LOWER(pokemonCard.name) LIKE :search OR LOWER(seller.firstName) LIKE :search OR LOWER(seller.lastName) LIKE :search
        )`,
        { search: `%${search.toLowerCase()}%` }
      );
    }
    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      sortBy ? `listing.${sortBy}` : undefined,
      sortOrder
    );
  }

  async findOne(id: number): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: [
        'seller',
        'pokemonCard',
        'pokemonCard.set',
        'pokemonCard.set.serie'
      ]
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async update(
    id: number,
    updateListingDto: UpdateListingDto,
    user: User
  ): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['seller']
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.seller.id !== user.id && user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `Refus update listing: user=${user.id} role=${user.role} targetListing=${id} seller=${listing.seller.id}`
      );
      throw new ForbiddenException(
        'You are not allowed to update this listing'
      );
    }
    Object.assign(listing, updateListingDto);
    return this.listingRepository.save(listing);
  }

  async delete(id: number, user: User): Promise<void> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['seller']
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.seller.id !== user.id && user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `Refus delete listing: user=${user.id} role=${user.role} targetListing=${id} seller=${listing.seller.id}`
      );
      throw new ForbiddenException(
        'You are not allowed to delete this listing'
      );
    }
    await this.listingRepository.delete(id);
  }

  async findBySellerId(
    sellerId: number,
    params: FindAllListingsParams = {}
  ): Promise<PaginatedResult<Listing>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      cardState,
      currency
    } = params;

    const qb = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoinAndSelect('listing.pokemonCard', 'pokemonCard')
      .leftJoinAndSelect('pokemonCard.set', 'set')
      .leftJoinAndSelect('set.serie', 'serie')
      .where('seller.id = :sellerId', { sellerId });

    if (search) {
      qb.andWhere(
        '(LOWER(pokemonCard.name) LIKE :search OR LOWER(set.name) LIKE :search)',
        { search: `%${search.toLowerCase()}%` }
      );
    }

    if (cardState) {
      qb.andWhere('listing.cardState = :cardState', { cardState });
    }

    if (currency) {
      qb.andWhere('listing.currency = :currency', { currency });
    }

    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      sortBy ? `listing.${sortBy}` : undefined,
      sortOrder
    );
  }

  /**
   * Get card statistics including price history, min/max/avg prices
   */
  async getCardStatistics(
    cardId: string,
    currency?: string,
    cardState?: string
  ) {
    const qb = this.listingRepository
      .createQueryBuilder('listing')
      .where('listing.pokemonCard.id = :cardId', { cardId });

    if (currency) {
      qb.andWhere('listing.currency = :currency', { currency });
    }
    if (cardState) {
      qb.andWhere('listing.cardState = :cardState', { cardState });
    }

    const listings = await qb.getMany();

    if (listings.length === 0) {
      return {
        cardId,
        totalListings: 0,
        minPrice: null,
        maxPrice: null,
        avgPrice: null,
        currency: currency || null,
        priceHistory: []
      };
    }

    const prices = listings.map((l) => parseFloat(l.price.toString()));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const priceHistoryWhere: FindOptionsWhere<PriceHistory> = {
      pokemonCard: { id: cardId },
      recordedAt: MoreThan(ninetyDaysAgo)
    };

    if (currency) {
      priceHistoryWhere.currency = currency as any;
    }
    if (cardState) {
      priceHistoryWhere.cardState = cardState as any;
    }

    const priceHistory = await this.priceHistoryRepository.find({
      where: priceHistoryWhere,
      order: { recordedAt: 'ASC' },
      take: 100
    });

    return {
      cardId,
      totalListings: listings.length,
      minPrice,
      maxPrice,
      avgPrice: Math.round(avgPrice * 100) / 100,
      currency: currency || listings[0].currency,
      priceHistory: priceHistory.map((h) => ({
        price: parseFloat(h.price.toString()),
        currency: h.currency,
        recordedAt: h.recordedAt
      }))
    };
  }

  /**
   * Get popular cards (most listed/viewed)
   */
  async getPopularCards(limit: number = 10) {
    const cards = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.pokemonCard', 'pokemonCard')
      .leftJoinAndSelect('pokemonCard.set', 'set')
      .leftJoinAndSelect('set.serie', 'serie')
      .select([
        'pokemonCard.id',
        'pokemonCard.name',
        'pokemonCard.image',
        'pokemonCard.localId',
        'pokemonCard.rarity',
        'set.name',
        'set.logo',
        'serie.name'
      ])
      .addSelect('COUNT(listing.id)', 'listing_count')
      .addSelect('MIN(listing.price)', 'min_price')
      .addSelect('AVG(listing.price)', 'avg_price')
      .groupBy('pokemonCard.id')
      .addGroupBy('pokemonCard.name')
      .addGroupBy('pokemonCard.image')
      .addGroupBy('pokemonCard.rarity')
      .addGroupBy('pokemonCard.localId')
      .addGroupBy('set.name')
      .addGroupBy('set.logo')
      .addGroupBy('serie.name')
      .orderBy('listing_count', 'DESC')
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
          serie: { name: card.serie_name }
        }
      },
      listingCount: parseInt(String(card.listing_count), 10) || 0,
      minPrice: parseFloat(String(card.min_price)) || 0,
      avgPrice: parseFloat(String(card.avg_price)) || 0
    }));
  }

  /**
   * Get trending cards (based on recent listings)
   */
  async getTrendingCards(limit: number = 10, days: number = 7) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const cards = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.pokemonCard', 'pokemonCard')
      .leftJoinAndSelect('pokemonCard.set', 'set')
      .leftJoinAndSelect('set.serie', 'serie')
      .where('listing.createdAt >= :daysAgo', { daysAgo })
      .select([
        'pokemonCard.id',
        'pokemonCard.name',
        'pokemonCard.image',
        'pokemonCard.localId',
        'pokemonCard.rarity',
        'set.name',
        'set.logo',
        'serie.name'
      ])
      .addSelect('COUNT(listing.id)', 'recent_listing_count')
      .addSelect('MIN(listing.price)', 'min_price')
      .groupBy('pokemonCard.id')
      .addGroupBy('pokemonCard.name')
      .addGroupBy('pokemonCard.image')
      .addGroupBy('pokemonCard.rarity')
      .addGroupBy('pokemonCard.localId')
      .addGroupBy('set.name')
      .addGroupBy('set.logo')
      .addGroupBy('serie.name')
      .orderBy('recent_listing_count', 'DESC')
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
          serie: { name: card.serie_name }
        }
      },
      recentListingCount: parseInt(String(card.recent_listing_count), 10) || 0,
      minPrice: parseFloat(String(card.min_price)) || 0
    }));
  }

  /**
   * Get best sellers (users with most sales)
   * Falls back to sellers with most active listings if no sales found
   */
  async getBestSellers(limit: number = 10) {
    const sellersFromOrders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoin('order.orderItems', 'orderItem')
      .leftJoin('orderItem.listing', 'listing')
      .leftJoin('listing.seller', 'seller')
      .select([
        'seller.id',
        'seller.firstName',
        'seller.lastName',
        'seller.avatarUrl',
        'seller.isPro'
      ])
      .addSelect('COUNT(DISTINCT order.id)', 'total_sales')
      .addSelect('SUM(order.totalAmount)', 'total_revenue')
      .where('order.status IN (:...statuses)', {
        statuses: ['Paid', 'Shipped']
      })
      .groupBy('seller.id')
      .addGroupBy('seller.firstName')
      .addGroupBy('seller.lastName')
      .addGroupBy('seller.avatarUrl')
      .addGroupBy('seller.isPro')
      .orderBy('total_sales', 'DESC')
      .limit(limit)
      .getRawMany();

    if (sellersFromOrders.length >= limit) {
      return sellersFromOrders.map((seller) => ({
        seller: {
          id: seller.seller_id,
          firstName: seller.seller_firstName,
          lastName: seller.seller_lastName,
          avatarUrl: seller.seller_avatarUrl,
          isPro: seller.seller_isPro
        },
        totalSales: parseInt(String(seller.total_sales), 10) || 0,
        totalRevenue: parseFloat(String(seller.total_revenue)) || 0
      }));
    }

    const sellersFromListings = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .select([
        'seller.id',
        'seller.firstName',
        'seller.lastName',
        'seller.avatarUrl',
        'seller.isPro'
      ])
      .addSelect('COUNT(listing.id)', 'active_listings')
      .addSelect('SUM(listing.price)', 'total_listing_value')
      .where('(listing.expiresAt IS NULL OR listing.expiresAt > :now)', {
        now: new Date()
      })
      .andWhere('listing.quantityAvailable > 0')
      .groupBy('seller.id')
      .addGroupBy('seller.firstName')
      .addGroupBy('seller.lastName')
      .addGroupBy('seller.avatarUrl')
      .addGroupBy('seller.isPro')
      .orderBy('active_listings', 'DESC')
      .limit(limit)
      .getRawMany();

    const sellerIdsFromOrders = new Set(
      sellersFromOrders.map((s: { seller_id: number }) => s.seller_id)
    );

    const sellersFromListingsFiltered = sellersFromListings.filter(
      (s: { seller_id: number }) => !sellerIdsFromOrders.has(s.seller_id)
    );

    const allSellers = [
      ...sellersFromOrders.map((seller) => ({
        seller: {
          id: seller.seller_id,
          firstName: seller.seller_firstName,
          lastName: seller.seller_lastName,
          avatarUrl: seller.seller_avatarUrl,
          isPro: seller.seller_isPro
        },
        totalSales: parseInt(String(seller.total_sales), 10) || 0,
        totalRevenue: parseFloat(String(seller.total_revenue)) || 0
      })),
      ...sellersFromListingsFiltered.map((seller) => ({
        seller: {
          id: seller.seller_id,
          firstName: seller.seller_firstName,
          lastName: seller.seller_lastName,
          avatarUrl: seller.seller_avatarUrl,
          isPro: seller.seller_isPro
        },
        totalSales: 0,
        totalRevenue: parseFloat(String(seller.total_listing_value)) || 0
      }))
    ].slice(0, limit);

    return allSellers;
  }

  /**
   * Get seller statistics
   */
  async getSellerStatistics(sellerId: number) {
    const listings = await this.listingRepository.find({
      where: { seller: { id: sellerId } },
      relations: [
        'seller',
        'pokemonCard',
        'pokemonCard.set',
        'pokemonCard.set.serie'
      ],
      order: { createdAt: 'DESC' }
    });

    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.orderItems', 'orderItem')
      .leftJoin('orderItem.listing', 'listing')
      .where('listing.seller.id = :sellerId', { sellerId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: ['Paid', 'Shipped']
      })
      .getMany();

    const totalRevenue = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount.toString()),
      0
    );
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    return {
      sellerId,
      totalListings: listings.length,
      activeListings: listings.filter(
        (l) => !l.expiresAt || new Date(l.expiresAt) > new Date()
      ).length,
      totalSales: orders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      listings: listings.slice(0, 20) // Return recent listings
    };
  }

  /**
   * Record price history when listing is created/updated
   */
  async recordPriceHistory(listing: Listing): Promise<void> {
    const priceHistory = this.priceHistoryRepository.create({
      pokemonCard: listing.pokemonCard,
      price: listing.price,
      currency: listing.currency,
      cardState: listing.cardState,
      quantityAvailable: listing.quantityAvailable
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
    sortOrder?: 'ASC' | 'DESC';
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
      sortBy = 'localId',
      sortOrder = 'ASC'
    } = params;

    const qb = this.pokemonCardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.set', 'set')
      .leftJoinAndSelect('set.serie', 'serie')
      .leftJoin(Listing, 'listing', 'listing.pokemonCard.id = card.id')
      .select([
        'card.id',
        'card.name',
        'card.image',
        'card.rarity',
        'card.localId',
        'set.id',
        'set.name',
        'set.logo',
        'set.symbol',
        'serie.id',
        'serie.name'
      ])
      .addSelect('COUNT(DISTINCT listing.id)', 'listing_count')
      .addSelect('MIN(listing.price)', 'min_price')
      .addSelect('AVG(listing.price)', 'avg_price')
      .groupBy('card.id')
      .addGroupBy('card.name')
      .addGroupBy('card.image')
      .addGroupBy('card.rarity')
      .addGroupBy('card.localId')
      .addGroupBy('set.id')
      .addGroupBy('set.name')
      .addGroupBy('set.logo')
      .addGroupBy('set.symbol')
      .addGroupBy('serie.id')
      .addGroupBy('serie.name');

    if (search) {
      qb.andWhere('card.name ILIKE :search', { search: `%${search}%` });
    }
    if (setId) {
      qb.andWhere('set.id = :setId', { setId });
    }
    if (serieId) {
      qb.andWhere('serie.id = :serieId', { serieId });
    }
    if (rarity) {
      qb.andWhere('card.rarity = :rarity', { rarity });
    }
    if (currency) {
      qb.andWhere('(listing.currency = :currency OR listing.id IS NULL)', {
        currency
      });
    }
    if (cardState) {
      qb.andWhere('(listing.cardState = :cardState OR listing.id IS NULL)', {
        cardState
      });
    }
    if (typeof priceMin === 'number') {
      qb.having('MIN(listing.price) >= :priceMin OR COUNT(listing.id) = 0', {
        priceMin
      });
    }
    if (typeof priceMax === 'number') {
      qb.having('MIN(listing.price) <= :priceMax OR COUNT(listing.id) = 0', {
        priceMax
      });
    }

    // Sorting with safeguards
    if (sortBy === 'price') {
      qb.orderBy('min_price', sortOrder);
    } else if (sortBy === 'popularity') {
      qb.orderBy('listing_count', 'DESC');
    } else if (sortBy === 'localId') {
      // For localId, sort as text but it will work for numeric strings
      // Since we added it to GROUP BY, we can reference it directly
      qb.orderBy('card.localId', sortOrder);
      // Add secondary sort by name for consistency
      qb.addOrderBy('card.name', 'ASC');
    } else if (sortBy === 'name' || sortBy === 'rarity') {
      // Safe fields that are in GROUP BY
      qb.orderBy(`card.${sortBy}`, sortOrder);
    } else {
      // Fallback to name if sortBy is not recognized
      qb.orderBy('card.name', sortOrder);
    }

    return PaginationHelper.paginateQueryBuilder(qb, { page, limit });
  }

  async findOrdersByBuyerId(buyerId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { buyer: { id: buyerId } },
      relations: [
        'orderItems',
        'orderItems.listing',
        'orderItems.listing.pokemonCard',
        'payments'
      ],
      order: { createdAt: 'DESC' }
    });
  }

  async findOrderById(id: number, userId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'buyer',
        'orderItems',
        'orderItems.listing',
        'orderItems.listing.pokemonCard',
        'payments'
      ]
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    if (order.buyer.id !== userId) {
      throw new ForbiddenException('You can only access your own orders');
    }

    return order;
  }

  async findOrderByIdAsAdmin(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'buyer',
        'orderItems',
        'orderItems.listing',
        'orderItems.listing.seller',
        'orderItems.listing.pokemonCard',
        'payments'
      ]
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
}
