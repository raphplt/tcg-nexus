import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceService } from './marketplace.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Listing } from './entities/listing.entity';
import { UpdateListingDto } from './dto/update-marketplace.dto';
import { PriceHistory } from './entities/price-history.entity';
import { Card } from '../card/entities/card.entity';
import { Order, OrderStatus } from './entities/order.entity';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../common/enums/user';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { OrderItem } from './entities/order-item.entity';
import { StripeService } from './stripe.service';
import { UserCartService } from '../user_cart/user_cart.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateListingDto } from './dto/create-marketplace.dto';
import { Currency } from '../common/enums/currency';
import { CardState } from '../common/enums/pokemonCardsType';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let listingRepo: any;
  let orderRepo: any;
  let userCartService: any;
  let priceHistoryRepo: any;

  // Mock definitions needed in scope
  let mockListingRepo: any;
  let mockPriceHistoryRepo: any;
  let mockPokemonCardRepo: any;
  let mockOrderRepo: any;
  let mockPaymentTransactionRepo: any;
  let mockOrderItemRepo: any;
  let mockStripeService: any;
  let mockUserCartService: any;

  // Helper to create a fresh QB mock
  const createMockQb = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getMany: jest.fn().mockResolvedValue([]),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([])
  });

  beforeEach(async () => {
    // Re-initialize mocks for every test to ensure isolation
    mockListingRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => createMockQb())
    };

    mockPriceHistoryRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn()
    };

    mockPokemonCardRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => createMockQb())
    };

    mockOrderRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => createMockQb())
    };

    mockPaymentTransactionRepo = {
      create: jest.fn(),
      save: jest.fn()
    };

    mockOrderItemRepo = {
      create: jest.fn(),
      save: jest.fn()
    };

    mockStripeService = {
      retrievePaymentIntent: jest.fn()
    };

    mockUserCartService = {
      findCartByUserId: jest.fn(),
      clearCart: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: getRepositoryToken(Listing), useValue: mockListingRepo },
        {
          provide: getRepositoryToken(PriceHistory),
          useValue: mockPriceHistoryRepo
        },
        {
          provide: getRepositoryToken(Card),
          useValue: mockPokemonCardRepo
        },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        {
          provide: getRepositoryToken(PaymentTransaction),
          useValue: mockPaymentTransactionRepo
        },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepo },
        { provide: StripeService, useValue: mockStripeService },
        { provide: UserCartService, useValue: mockUserCartService }
      ]
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
    listingRepo = module.get(getRepositoryToken(Listing));
    orderRepo = module.get(getRepositoryToken(Order));
    userCartService = module.get(UserCartService);
    priceHistoryRepo = module.get(getRepositoryToken(PriceHistory));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const user = { id: 1 } as User;
    const dto: CreateOrderDto = {
      paymentIntentId: 'pi_123',
      shippingAddress: '123 Main St'
    };

    it('should create an order successfully', async () => {
      const cart = {
        cartItems: [
          {
            listing: { id: 1, price: 10, quantityAvailable: 5 },
            quantity: 2
          }
        ]
      };
      userCartService.findCartByUserId.mockResolvedValue(cart);
      orderRepo.create.mockReturnValue({});
      orderRepo.save.mockResolvedValue({ id: 1 });

      const result = await service.createOrder(dto, user);

      expect(result).toEqual({ id: 1 });
      expect(orderRepo.save).toHaveBeenCalled();
      expect(userCartService.clearCart).toHaveBeenCalledWith(user.id);
    });

    it('should throw BadRequestException if cart is empty', async () => {
      userCartService.findCartByUserId.mockResolvedValue({ cartItems: [] });
      await expect(service.createOrder(dto, user)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if insufficient quantity', async () => {
      const cart = {
        cartItems: [
          {
            listing: { id: 1, price: 10, quantityAvailable: 1 },
            quantity: 2
          }
        ]
      };
      userCartService.findCartByUserId.mockResolvedValue(cart);
      await expect(service.createOrder(dto, user)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('update ownership', () => {
    const owner: User = { id: 1, role: UserRole.USER } as any;
    const other: User = { id: 2, role: UserRole.USER } as any;
    const admin: User = { id: 3, role: UserRole.ADMIN } as any;
    const listing: Partial<Listing> = { id: 10, seller: { id: 1 } as any };

    it('throws NotFound if listing missing', async () => {
      listingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update(10, { price: 100 } as UpdateListingDto, owner)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids non-owner non-admin', async () => {
      listingRepo.findOne.mockResolvedValue(listing);
      await expect(
        service.update(10, { price: 100 } as UpdateListingDto, other)
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows owner', async () => {
      listingRepo.findOne.mockResolvedValue({ ...listing });
      listingRepo.save.mockImplementation(async (l: Listing) => l);
      const res = await service.update(
        10,
        { price: 200 } as UpdateListingDto,
        owner
      );
      expect(res).toBeDefined();
      expect(listingRepo.save).toHaveBeenCalled();
    });

    it('allows admin', async () => {
      listingRepo.findOne.mockResolvedValue({ ...listing });
      listingRepo.save.mockImplementation(async (l: Listing) => l);
      const res = await service.update(
        10,
        { price: 300 } as UpdateListingDto,
        admin
      );
      expect(res).toBeDefined();
      expect(listingRepo.save).toHaveBeenCalled();
    });
  });

  describe('delete ownership', () => {
    const owner: User = { id: 1, role: UserRole.USER } as any;
    const other: User = { id: 2, role: UserRole.USER } as any;
    const admin: User = { id: 3, role: UserRole.ADMIN } as any;
    const listing: Partial<Listing> = { id: 10, seller: { id: 1 } as any };

    it('throws NotFound if listing missing', async () => {
      listingRepo.findOne.mockResolvedValue(null);
      await expect(service.delete(10, owner)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('forbids non-owner non-admin', async () => {
      listingRepo.findOne.mockResolvedValue(listing);
      await expect(service.delete(10, other)).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it('allows owner', async () => {
      listingRepo.findOne.mockResolvedValue({ ...listing });
      await service.delete(10, owner);
      expect(listingRepo.delete).toHaveBeenCalledWith(10);
    });

    it('allows admin', async () => {
      listingRepo.findOne.mockResolvedValue({ ...listing });
      await service.delete(10, admin);
      expect(listingRepo.delete).toHaveBeenCalledWith(10);
    });
  });

  describe('findAll', () => {
    it('applies filters correctly', async () => {
      const qb = createMockQb();
      mockListingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({
        sellerId: 1,
        pokemonCardId: 'c1',
        cardState: 'NM',
        currency: 'EUR',
        priceMin: 10,
        priceMax: 100,
        search: 'Charizard',
        page: 1,
        limit: 10
      });

      expect(qb.andWhere).toHaveBeenCalledWith('seller.id = :sellerId', {
        sellerId: 1
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'pokemonCard.id = :pokemonCardId',
        { pokemonCardId: 'c1' }
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'listing.cardState = :cardState',
        { cardState: 'NM' }
      );
      expect(qb.andWhere).toHaveBeenCalledWith('listing.currency = :currency', {
        currency: 'EUR'
      });
      expect(qb.andWhere).toHaveBeenCalledWith('listing.price >= :priceMin', {
        priceMin: 10
      });
      expect(qb.andWhere).toHaveBeenCalledWith('listing.price <= :priceMax', {
        priceMax: 100
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(pokemonCard.name) LIKE'),
        expect.anything()
      );
    });
  });

  describe('findBySellerId', () => {
    it('filters by sellerId and search', async () => {
      const qb = createMockQb();
      mockListingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findBySellerId(1, { search: 'test', cardState: 'NM' });

      expect(qb.where).toHaveBeenCalledWith('seller.id = :sellerId', {
        sellerId: 1
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE :search'),
        expect.anything()
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'listing.cardState = :cardState',
        { cardState: 'NM' }
      );
    });

    it('applies currency filter', async () => {
      const qb = createMockQb();
      mockListingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findBySellerId(2, { currency: 'EUR' });
      expect(qb.andWhere).toHaveBeenCalledWith('listing.currency = :currency', {
        currency: 'EUR'
      });
    });
  });

  describe('create listing', () => {
    it('creates listing and records price history', async () => {
      const dto: CreateListingDto = {
        pokemonCardId: 'c1',
        price: 10,
        currency: Currency.USD,
        cardState: CardState.NM,
        quantityAvailable: 1
      };
      const user = { id: 1 } as User;
      const savedListing = {
        id: 1,
        ...dto,
        seller: user,
        pokemonCard: { id: 'c1' }
      };

      listingRepo.create.mockReturnValue(savedListing);
      listingRepo.save.mockResolvedValue(savedListing);
      listingRepo.findOne.mockResolvedValue(savedListing); // For verify logic inside

      const result = await service.create(dto, user);

      expect(result).toBeDefined();
      expect(priceHistoryRepo.create).toHaveBeenCalled();
      expect(priceHistoryRepo.save).toHaveBeenCalled();
    });

    it('throws bad request if pokemonCardId missing', async () => {
      await expect(
        service.create({} as any, { id: 1 } as User)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCardStatistics', () => {
    it('calculates average, min, max correctly', async () => {
      const qb = createMockQb();
      qb.getMany.mockResolvedValue([
        { price: 10, currency: 'USD' },
        { price: 20, currency: 'USD' },
        { price: 30, currency: 'USD' }
      ]);
      mockListingRepo.createQueryBuilder.mockReturnValue(qb);
      mockPriceHistoryRepo.find.mockResolvedValue([
        { price: 15, recordedAt: new Date() }
      ]);

      const stats = await service.getCardStatistics('c1');

      expect(stats.minPrice).toBe(10);
      expect(stats.maxPrice).toBe(30);
      expect(stats.avgPrice).toBe(20);
      expect(stats.totalListings).toBe(3);
      expect(stats.priceHistory).toHaveLength(1);
    });

    it('handles empty listings', async () => {
      const qb = createMockQb();
      qb.getMany.mockResolvedValue([]);
      mockListingRepo.createQueryBuilder.mockReturnValue(qb);

      const stats = await service.getCardStatistics('c1');
      expect(stats.totalListings).toBe(0);
      expect(stats.minPrice).toBeNull();
    });

    it('applies currency and cardState filters', async () => {
      const qb = createMockQb();
      qb.getMany.mockResolvedValue([{ price: 5, currency: 'EUR' }]);
      mockListingRepo.createQueryBuilder.mockReturnValue(qb);
      mockPriceHistoryRepo.find.mockResolvedValue([]);

      await service.getCardStatistics('card', 'EUR', 'NM');

      expect(qb.andWhere).toHaveBeenCalledWith('listing.currency = :currency', {
        currency: 'EUR'
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'listing.cardState = :cardState',
        { cardState: 'NM' }
      );
      expect(mockPriceHistoryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            currency: 'EUR',
            cardState: 'NM'
          })
        })
      );
    });
  });

  describe('getPopularCards', () => {
    it('maps raw result correctly', async () => {
      const qb = createMockQb();
      qb.getRawMany.mockResolvedValue([
        {
          pokemonCard_id: 'c1',
          listing_count: '5',
          min_price: '10',
          avg_price: '12'
        }
      ]);
      mockListingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getPopularCards(10);
      expect(result).toHaveLength(1);
      expect(result[0].listingCount).toBe(5);
      expect(result[0].minPrice).toBe(10);
    });
  });

  describe('getTrendingCards', () => {
    it('maps raw result correctly', async () => {
      const qb = createMockQb();
      qb.getRawMany.mockResolvedValue([
        { pokemonCard_id: 'c1', recent_listing_count: '10', min_price: '8' }
      ]);
      mockListingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTrendingCards();
      expect(result).toHaveLength(1);
      expect(result[0].recentListingCount).toBe(10);
    });
  });

  describe('getBestSellers', () => {
    it('returns best sellers based on orders', async () => {
      const orderQb = createMockQb();
      orderQb.getRawMany.mockResolvedValue([
        {
          seller_id: 1,
          seller_firstName: 'John',
          total_sales: '100',
          total_revenue: '5000'
        }
      ]);
      mockOrderRepo.createQueryBuilder.mockReturnValue(orderQb);

      // Ensure listingRepo returns empty to simulate no "listing-only" top sellers
      const listingQb = createMockQb();
      listingQb.getRawMany.mockResolvedValue([]);
      mockListingRepo.createQueryBuilder.mockReturnValue(listingQb);

      const result = await service.getBestSellers(10);
      expect(result).toHaveLength(1);
      expect(result[0].seller.firstName).toBe('John');
      expect(result[0].totalSales).toBe(100);
    });

    it('returns early when enough sellers from orders', async () => {
      const orderQb = createMockQb();
      orderQb.getRawMany.mockResolvedValue([
        {
          seller_id: 1,
          seller_firstName: 'John',
          seller_lastName: 'D',
          seller_avatarUrl: 'a',
          seller_isPro: false,
          total_sales: '2',
          total_revenue: '10'
        }
      ]);
      mockOrderRepo.createQueryBuilder.mockReturnValue(orderQb);

      await service.getBestSellers(1);
      expect(mockListingRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('falls back to active listings if orders not enough', async () => {
      const orderQb = createMockQb();
      orderQb.getRawMany.mockResolvedValue([]); // No sales
      mockOrderRepo.createQueryBuilder.mockReturnValue(orderQb);

      const listingQb = createMockQb();
      listingQb.getRawMany.mockResolvedValue([
        {
          seller_id: 2,
          seller_firstName: 'Alice',
          active_listings: '50',
          total_listing_value: '2000'
        }
      ]);
      mockListingRepo.createQueryBuilder.mockReturnValue(listingQb);

      const result = await service.getBestSellers(10);
      expect(result).toHaveLength(1);
      expect(result[0].seller.firstName).toBe('Alice');
      expect(result[0].totalRevenue).toBe(2000);
    });
  });

  describe('getSellerStatistics', () => {
    it('calculates seller stats', async () => {
      listingRepo.find.mockResolvedValue([
        { id: 1, expiresAt: new Date(Date.now() + 10000) }
      ]);
      const orderQb = createMockQb();
      orderQb.getMany.mockResolvedValue([
        { totalAmount: 100 },
        { totalAmount: 200 }
      ]);
      mockOrderRepo.createQueryBuilder.mockReturnValue(orderQb);

      const stats = await service.getSellerStatistics(1);

      expect(stats.totalListings).toBe(1);
      expect(stats.activeListings).toBe(1);
      expect(stats.totalSales).toBe(2);
      expect(stats.totalRevenue).toBe(300);
      expect(stats.avgOrderValue).toBe(150);
    });
  });

  describe('getCardsWithMarketplaceData', () => {
    it('calls query builder with correct params', async () => {
      const qb = createMockQb();
      mockPokemonCardRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getCardsWithMarketplaceData({
        search: 'test',
        priceMin: 10,
        sortBy: 'price'
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'card.name ILIKE :search',
        expect.anything()
      );
      expect(qb.having).toHaveBeenCalledWith(
        expect.stringContaining('MIN(listing.price) >= :priceMin'),
        expect.anything()
      );
      expect(qb.orderBy).toHaveBeenCalledWith('min_price', 'ASC');
    });

    it('applies filters and fallback sorting', async () => {
      const qb = createMockQb();
      mockPokemonCardRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getCardsWithMarketplaceData({
        setId: 'set1',
        serieId: 'serie1',
        rarity: 'rare',
        currency: 'USD',
        cardState: 'NM',
        priceMax: 50,
        sortBy: 'unknown' as any
      });

      expect(qb.andWhere).toHaveBeenCalledWith('set.id = :setId', {
        setId: 'set1'
      });
      expect(qb.andWhere).toHaveBeenCalledWith('serie.id = :serieId', {
        serieId: 'serie1'
      });
      expect(qb.andWhere).toHaveBeenCalledWith('card.rarity = :rarity', {
        rarity: 'rare'
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(listing.currency = :currency OR listing.id IS NULL)',
        { currency: 'USD' }
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(listing.cardState = :cardState OR listing.id IS NULL)',
        { cardState: 'NM' }
      );
      expect(qb.having).toHaveBeenCalledWith(
        expect.stringContaining('<= :priceMax'),
        expect.objectContaining({ priceMax: 50 })
      );
      expect(qb.orderBy).toHaveBeenCalledWith('card.name', 'ASC');
    });
  });

  describe('findAllOrders', () => {
    it('returns filtered orders', async () => {
      const qb = createMockQb();
      mockOrderRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllOrders({ status: OrderStatus.PAID, buyerId: 1 });

      expect(qb.andWhere).toHaveBeenCalledWith('order.status = :status', {
        status: OrderStatus.PAID
      });
      expect(qb.andWhere).toHaveBeenCalledWith('buyer.id = :buyerId', {
        buyerId: 1
      });
    });

    it('applies seller filter', async () => {
      const qb = createMockQb();
      mockOrderRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllOrders({ sellerId: 2 } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('seller.id = :sellerId', {
        sellerId: 2
      });
    });
  });

  describe('orders retrieval', () => {
    it('findOrdersByBuyerId delegates to repository', async () => {
      mockOrderRepo.find.mockResolvedValue([{ id: 1 }]);
      const res = await service.findOrdersByBuyerId(3);
      expect(res).toHaveLength(1);
      expect(mockOrderRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { buyer: { id: 3 } } })
      );
    });

    it('findOrderById throws not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      await expect(service.findOrderById(1, 1)).rejects.toThrow(
        NotFoundException
      );
    });

    it('findOrderById forbids other users', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        id: 1,
        buyer: { id: 99 }
      });
      await expect(service.findOrderById(1, 1)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('findOrderById returns order for owner', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        id: 1,
        buyer: { id: 5 }
      });
      await expect(service.findOrderById(1, 5)).resolves.toEqual(
        expect.objectContaining({ id: 1 })
      );
    });

    it('findOrderByIdAsAdmin throws when missing', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      await expect(service.findOrderByIdAsAdmin(10)).rejects.toThrow(
        NotFoundException
      );
    });

    it('updateOrderStatus uses admin lookup', async () => {
      const order = { id: 1, status: OrderStatus.PENDING };
      jest
        .spyOn(service, 'findOrderByIdAsAdmin')
        .mockResolvedValue(order as any);
      mockOrderRepo.save.mockResolvedValue({
        ...order,
        status: OrderStatus.PAID
      });

      const res = await service.updateOrderStatus(1, OrderStatus.PAID);
      expect(service.findOrderByIdAsAdmin).toHaveBeenCalledWith(1);
      expect(res.status).toBe(OrderStatus.PAID);
    });
  });
});
