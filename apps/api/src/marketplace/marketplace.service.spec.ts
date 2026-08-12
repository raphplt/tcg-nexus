import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Card } from "../card/entities/card.entity";
import { Currency } from "../common/enums/currency";
import { ListingStatus } from "../common/enums/listing-status";
import { CardState } from "../common/enums/pokemonCardsType";
import { ProductKind } from "../common/enums/product-kind";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import { UserCartService } from "../user_cart/user_cart.service";
import { CardPopularityService } from "./card-popularity.service";
import { CreateListingDto } from "./dto/create-marketplace.dto";
import { UpdateListingDto } from "./dto/update-marketplace.dto";
import { Listing } from "./entities/listing.entity";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { PaymentTransaction } from "./entities/payment-transaction.entity";
import { PriceHistory } from "./entities/price-history.entity";
import { MarketplaceService } from "./marketplace.service";
import { OrderService } from "./order.service";
import { SHIPPING_POLICY } from "./shipping-policy";
import { StripeService } from "./stripe.service";

describe("MarketplaceService", () => {
  let service: MarketplaceService;
  let listingRepo: any;
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
  let mockUserRepository: any;
  let mockCardPopularityService: any;
  let mockOrderService: any;
  let mockDataSource: any;
  let mockManager: any;

  // Helper to create a fresh QB mock
  const createMockQb = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
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
    andHaving: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
    getRawOne: jest.fn().mockResolvedValue(null),
  });

  beforeEach(async () => {
    // Re-initialize mocks for every test to ensure isolation
    mockListingRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      softRemove: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      increment: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => createMockQb()),
    };

    mockPriceHistoryRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    mockPokemonCardRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => createMockQb()),
    };

    mockOrderRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => createMockQb()),
    };

    mockPaymentTransactionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockOrderItemRepo = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => createMockQb()),
    };

    mockStripeService = {
      retrievePaymentIntent: jest.fn().mockResolvedValue({
        status: "succeeded",
        amount: 2000,
      }),
    };

    mockUserCartService = {
      findCartByUserId: jest.fn(),
      clearCart: jest.fn(),
    };

    mockUserRepository = {
      findOne: jest.fn(),
    };

    mockCardPopularityService = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };

    mockOrderService = {
      getSellerRevenue: jest
        .fn()
        .mockResolvedValue({ totalSales: 0, revenueByCurrency: {} }),
    };

    mockManager = {
      findOne: jest.fn().mockImplementation(async (cls, options) => {
        if (cls === Listing) {
          return mockListingRepo.findOne(options);
        }
        return null;
      }),
      create: jest.fn().mockImplementation((cls, data) => {
        if (cls === Order) {
          return mockOrderRepo.create(data);
        }
        if (cls === OrderItem) {
          return mockOrderItemRepo.create(data);
        }
        if (cls === PaymentTransaction) {
          return mockPaymentTransactionRepo.create(data);
        }
        return data;
      }),
      save: jest.fn().mockImplementation(async (arg1, arg2) => {
        const entity = arg2 || arg1;
        const cls = arg2 ? arg1 : undefined;
        if (cls === Order) {
          return mockOrderRepo.save(entity);
        }
        if (cls === OrderItem) {
          return mockOrderItemRepo.save(entity);
        }
        if (cls === PaymentTransaction) {
          return mockPaymentTransactionRepo.save(entity);
        }
        return entity;
      }),
      decrement: jest.fn().mockResolvedValue(undefined),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: getRepositoryToken(Listing), useValue: mockListingRepo },
        {
          provide: getRepositoryToken(PriceHistory),
          useValue: mockPriceHistoryRepo,
        },
        {
          provide: getRepositoryToken(Card),
          useValue: mockPokemonCardRepo,
        },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        {
          provide: getRepositoryToken(PaymentTransaction),
          useValue: mockPaymentTransactionRepo,
        },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: StripeService, useValue: mockStripeService },
        { provide: UserCartService, useValue: mockUserCartService },
        { provide: CardPopularityService, useValue: mockCardPopularityService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: OrderService, useValue: mockOrderService },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
    listingRepo = module.get(getRepositoryToken(Listing));
    priceHistoryRepo = module.get(getRepositoryToken(PriceHistory));

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("update ownership", () => {
    const owner: User = { id: 1, role: UserRole.USER } as any;
    const other: User = { id: 2, role: UserRole.USER } as any;
    const admin: User = { id: 3, role: UserRole.ADMIN } as any;
    const listing: Partial<Listing> = { id: 10, seller: { id: 1 } as any };

    it("throws NotFound if listing missing", async () => {
      listingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update(10, { price: 100 } as UpdateListingDto, owner),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("forbids non-owner non-admin", async () => {
      listingRepo.findOne.mockResolvedValue(listing);
      await expect(
        service.update(10, { price: 100 } as UpdateListingDto, other),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("allows owner", async () => {
      listingRepo.findOne.mockResolvedValue({ ...listing });
      listingRepo.save.mockImplementation(async (l: Listing) => l);
      const res = await service.update(
        10,
        { price: 200 } as UpdateListingDto,
        owner,
      );
      expect(res).toBeDefined();
      expect(listingRepo.save).toHaveBeenCalled();
    });

    it("allows admin", async () => {
      listingRepo.findOne.mockResolvedValue({ ...listing });
      listingRepo.save.mockImplementation(async (l: Listing) => l);
      const res = await service.update(
        10,
        { price: 300 } as UpdateListingDto,
        admin,
      );
      expect(res).toBeDefined();
      expect(listingRepo.save).toHaveBeenCalled();
    });

    it("records a price history point when the price changes", async () => {
      const priced = { ...listing, price: 100, currency: Currency.EUR };
      listingRepo.findOne.mockResolvedValueOnce(priced).mockResolvedValueOnce({
        ...priced,
        price: 200,
        pokemonCard: { id: "c1" },
      });
      listingRepo.save.mockImplementation(async (l: Listing) => l);
      priceHistoryRepo.create.mockImplementation((data: any) => data);

      await service.update(10, { price: 200 } as UpdateListingDto, owner);

      expect(priceHistoryRepo.save).toHaveBeenCalled();
    });

    it("does not record history when the price is unchanged", async () => {
      listingRepo.findOne.mockResolvedValue({
        ...listing,
        price: 100,
        currency: Currency.EUR,
      });
      listingRepo.save.mockImplementation(async (l: Listing) => l);

      await service.update(
        10,
        { description: "nouvelle description" } as UpdateListingDto,
        owner,
      );

      expect(priceHistoryRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("delete ownership", () => {
    const owner: User = { id: 1, role: UserRole.USER } as any;
    const other: User = { id: 2, role: UserRole.USER } as any;
    const admin: User = { id: 3, role: UserRole.ADMIN } as any;
    const listing: Partial<Listing> = { id: 10, seller: { id: 1 } as any };

    it("throws NotFound if listing missing", async () => {
      listingRepo.findOne.mockResolvedValue(null);
      await expect(service.delete(10, owner)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("forbids non-owner non-admin", async () => {
      listingRepo.findOne.mockResolvedValue(listing);
      await expect(service.delete(10, other)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("allows owner", async () => {
      const found = { ...listing };
      listingRepo.findOne.mockResolvedValue(found);
      await service.delete(10, owner);
      expect(listingRepo.softRemove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 10 }),
      );
    });

    it("allows admin", async () => {
      const found = { ...listing };
      listingRepo.findOne.mockResolvedValue(found);
      await service.delete(10, admin);
      expect(listingRepo.softRemove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 10 }),
      );
    });
  });

  describe("findAll", () => {
    it("applies filters correctly", async () => {
      const qb = createMockQb();
      mockListingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({
        sellerId: 1,
        pokemonCardId: "c1",
        cardState: "NM",
        currency: "EUR",
        priceMin: 10,
        priceMax: 100,
        search: "Charizard",
        page: 1,
        limit: 10,
      });

      expect(qb.andWhere).toHaveBeenCalledWith("seller.id = :sellerId", {
        sellerId: 1,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        "pokemonCard.id = :pokemonCardId",
        { pokemonCardId: "c1" },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        "listing.cardState = :cardState",
        { cardState: "NM" },
      );
      expect(qb.andWhere).toHaveBeenCalledWith("listing.currency = :currency", {
        currency: "EUR",
      });
      expect(qb.andWhere).toHaveBeenCalledWith("listing.price >= :priceMin", {
        priceMin: 10,
      });
      expect(qb.andWhere).toHaveBeenCalledWith("listing.price <= :priceMax", {
        priceMax: 100,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("LOWER(pokemonCard.name) LIKE"),
        expect.anything(),
      );
    });
  });

  describe("findBySellerId", () => {
    it("filters by sellerId and search", async () => {
      const qb = createMockQb();
      mockListingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findBySellerId(1, { search: "test", cardState: "NM" });

      expect(qb.where).toHaveBeenCalledWith("seller.id = :sellerId", {
        sellerId: 1,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("LIKE :search"),
        expect.anything(),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        "listing.cardState = :cardState",
        { cardState: "NM" },
      );
    });

    it("applies currency filter", async () => {
      const qb = createMockQb();
      mockListingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findBySellerId(2, { currency: "EUR" });
      expect(qb.andWhere).toHaveBeenCalledWith("listing.currency = :currency", {
        currency: "EUR",
      });
    });
  });

  describe("create listing", () => {
    it("creates listing and records price history", async () => {
      const dto: CreateListingDto = {
        pokemonCardId: "c1",
        price: 10,
        currency: Currency.USD,
        cardState: CardState.NM,
        quantityAvailable: 1,
      };
      const user = { id: 1 } as User;
      const savedListing = {
        id: 1,
        ...dto,
        seller: user,
        pokemonCard: { id: "c1" },
      };

      listingRepo.create.mockReturnValue(savedListing);
      listingRepo.save.mockResolvedValue(savedListing);
      listingRepo.findOne.mockResolvedValue(savedListing); // For verify logic inside

      const result = await service.create(dto, user);

      expect(result).toBeDefined();
      expect(priceHistoryRepo.create).toHaveBeenCalled();
      expect(priceHistoryRepo.save).toHaveBeenCalled();
    });

    it("throws bad request if pokemonCardId missing", async () => {
      await expect(
        service.create({} as any, { id: 1 } as User),
      ).rejects.toThrow(BadRequestException);
    });

    it("applies the platform shipping policy instead of seller values", async () => {
      const dto = {
        pokemonCardId: "c1",
        price: 10,
        currency: Currency.EUR,
        cardState: CardState.NM,
        // Valeurs qu'un client tenterait de forcer
        shippingCost: 42,
        handlingTimeDays: 25,
      } as CreateListingDto;

      listingRepo.create.mockImplementation((data: any) => data);
      listingRepo.save.mockResolvedValue({ id: 1 });
      listingRepo.findOne.mockResolvedValue({ id: 1 });

      await service.create(dto, { id: 1 } as User);

      expect(listingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          shippingCost: SHIPPING_POLICY.rates[ProductKind.CARD].cost,
          handlingTimeDays: SHIPPING_POLICY.handlingTimeDays,
        }),
      );
    });

    it("applies the sealed rate for sealed listings", async () => {
      const dto = {
        sealedProductId: "s1",
        productKind: ProductKind.SEALED,
        price: 60,
        currency: Currency.EUR,
      } as CreateListingDto;

      listingRepo.create.mockImplementation((data: any) => data);
      listingRepo.save.mockResolvedValue({ id: 2 });
      listingRepo.findOne.mockResolvedValue({ id: 2 });

      await service.create(dto, { id: 1 } as User);

      expect(listingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          shippingCost: SHIPPING_POLICY.rates[ProductKind.SEALED].cost,
        }),
      );
    });
  });

  describe("getPriceSuggestion", () => {
    const mockAggregates = (
      sameState: Record<string, string> | null,
      allStates: Record<string, string> | null,
    ) => {
      const sameStateQb = createMockQb();
      sameStateQb.getRawOne.mockResolvedValue(sameState);
      const allStatesQb = createMockQb();
      allStatesQb.getRawOne.mockResolvedValue(allStates);

      mockListingRepo.createQueryBuilder
        .mockReturnValueOnce(sameStateQb)
        .mockReturnValueOnce(allStatesQb);
    };

    it("suggests the average of listings in the same state", async () => {
      mockPokemonCardRepo.findOne.mockResolvedValue({
        id: "c1",
        pricing: null,
      });
      mockAggregates(
        { count: "3", minPrice: "10", maxPrice: "20", avgPrice: "15.005" },
        { count: "5", minPrice: "8", maxPrice: "30", avgPrice: "18" },
      );

      const result = await service.getPriceSuggestion("c1", CardState.NM);

      expect(result.basis).toBe("same-state");
      expect(result.suggestedPrice).toBe(15.01);
      expect(result.listings.count).toBe(3);
    });

    it("falls back to all states then to the market price", async () => {
      mockPokemonCardRepo.findOne.mockResolvedValue({
        id: "c1",
        pricing: { cardmarket: { trend: 12.3 } },
      });
      mockAggregates({ count: "0" }, { count: "0" });

      const result = await service.getPriceSuggestion("c1", CardState.NM);

      expect(result.basis).toBe("market");
      expect(result.suggestedPrice).toBe(12.3);
    });

    it("returns no suggestion when nothing is available", async () => {
      mockPokemonCardRepo.findOne.mockResolvedValue({
        id: "c1",
        pricing: null,
      });
      mockAggregates({ count: "0" }, { count: "0" });

      const result = await service.getPriceSuggestion("c1");

      expect(result.basis).toBeNull();
      expect(result.suggestedPrice).toBeNull();
    });

    it("throws when the card does not exist", async () => {
      mockPokemonCardRepo.findOne.mockResolvedValue(null);

      await expect(service.getPriceSuggestion("unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getCardStatistics", () => {
    const mockStatsQueries = (
      currencyRows: Array<{ currency: string; count: string }>,
      aggregates: Record<string, string | null> | null,
    ) => {
      const currencyQb = createMockQb();
      currencyQb.getRawMany.mockResolvedValue(currencyRows);
      const statsQb = createMockQb();
      statsQb.getRawOne.mockResolvedValue(aggregates);

      mockListingRepo.createQueryBuilder
        .mockReturnValueOnce(currencyQb)
        .mockReturnValueOnce(statsQb);

      return { currencyQb, statsQb };
    };

    it("calculates average, min, max correctly", async () => {
      mockStatsQueries([{ currency: "EUR", count: "3" }], {
        totalListings: "3",
        minPrice: "10",
        maxPrice: "30",
        avgPrice: "20",
      });
      mockPriceHistoryRepo.find.mockResolvedValue([
        { price: 15, recordedAt: new Date() },
      ]);

      const stats = await service.getCardStatistics("c1");

      expect(stats.minPrice).toBe(10);
      expect(stats.maxPrice).toBe(30);
      expect(stats.avgPrice).toBe(20);
      expect(stats.totalListings).toBe(3);
      expect(stats.currency).toBe("EUR");
      expect(stats.priceHistory).toHaveLength(1);
    });

    it("handles empty listings", async () => {
      mockStatsQueries([], null);

      const stats = await service.getCardStatistics("c1");
      expect(stats.totalListings).toBe(0);
      expect(stats.minPrice).toBeNull();
    });

    it("aggregates in a single currency instead of mixing them", async () => {
      const { statsQb } = mockStatsQueries(
        [
          { currency: "USD", count: "5" },
          { currency: "EUR", count: "2" },
        ],
        {
          totalListings: "5",
          minPrice: "8",
          maxPrice: "12",
          avgPrice: "10",
        },
      );
      mockPriceHistoryRepo.find.mockResolvedValue([]);

      const stats = await service.getCardStatistics("c1");

      expect(stats.currency).toBe("USD");
      expect(stats.availableCurrencies).toEqual(["USD", "EUR"]);
      expect(statsQb.andWhere).toHaveBeenCalledWith(
        "listing.currency = :statsCurrency",
        { statsCurrency: "USD" },
      );
    });

    it("applies currency and cardState filters", async () => {
      const { statsQb } = mockStatsQueries([{ currency: "EUR", count: "1" }], {
        totalListings: "1",
        minPrice: "5",
        maxPrice: "5",
        avgPrice: "5",
      });
      mockPriceHistoryRepo.find.mockResolvedValue([]);

      await service.getCardStatistics("card", "EUR", "NM");

      expect(statsQb.andWhere).toHaveBeenCalledWith(
        "listing.currency = :statsCurrency",
        { statsCurrency: "EUR" },
      );
      expect(statsQb.andWhere).toHaveBeenCalledWith(
        "listing.cardState = :cardState",
        { cardState: "NM" },
      );
      expect(mockPriceHistoryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            currency: "EUR",
            cardState: "NM",
          }),
        }),
      );
    });

    it("returns no aggregate when the requested currency has no listing", async () => {
      mockStatsQueries([{ currency: "EUR", count: "3" }], null);

      const stats = await service.getCardStatistics("c1", "JPY");

      expect(stats.totalListings).toBe(0);
      expect(stats.currency).toBe("JPY");
      expect(stats.availableCurrencies).toEqual(["EUR"]);
    });
  });

  describe("getPopularCards", () => {
    it("maps raw result correctly", async () => {
      const qb = createMockQb();
      qb.getRawMany.mockResolvedValue([
        {
          pokemonCard_id: "c1",
          listing_count: "5",
          min_price: "10",
          avg_price: "12",
        },
      ]);
      mockListingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getPopularCards(10);
      expect(result).toHaveLength(1);
      expect(result[0].listingCount).toBe(5);
      expect(result[0].minPrice).toBe(10);
    });
  });

  describe("getTrendingCards", () => {
    it("maps raw result correctly", async () => {
      const qb = createMockQb();
      qb.getRawMany.mockResolvedValue([
        { pokemonCard_id: "c1", recent_listing_count: "10", min_price: "8" },
      ]);
      mockListingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTrendingCards();
      expect(result).toHaveLength(1);
      expect(result[0].recentListingCount).toBe(10);
    });
  });

  describe("getBestSellers", () => {
    it("returns best sellers based on their own order lines", async () => {
      const itemQb = createMockQb();
      itemQb.getRawMany.mockResolvedValue([
        {
          seller_id: 1,
          seller_firstName: "John",
          total_sales: "100",
          total_revenue: "5000",
          currency: "EUR",
        },
      ]);
      mockOrderItemRepo.createQueryBuilder.mockReturnValue(itemQb);

      // Ensure listingRepo returns empty to simulate no "listing-only" top sellers
      const listingQb = createMockQb();
      listingQb.getRawMany.mockResolvedValue([]);
      mockListingRepo.createQueryBuilder.mockReturnValue(listingQb);

      const result = await service.getBestSellers(10);
      expect(result).toHaveLength(1);
      expect(result[0].seller.firstName).toBe("John");
      expect(result[0].totalSales).toBe(100);
      expect(result[0].currency).toBe("EUR");
    });

    it("returns early when enough sellers from orders", async () => {
      const itemQb = createMockQb();
      itemQb.getRawMany.mockResolvedValue([
        {
          seller_id: 1,
          seller_firstName: "John",
          seller_lastName: "D",
          seller_avatarUrl: "a",
          seller_isPro: false,
          total_sales: "2",
          total_revenue: "10",
          currency: "EUR",
        },
      ]);
      mockOrderItemRepo.createQueryBuilder.mockReturnValue(itemQb);

      await service.getBestSellers(1);
      expect(mockListingRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("falls back to active listings without inventing revenue", async () => {
      const itemQb = createMockQb();
      itemQb.getRawMany.mockResolvedValue([]); // No sales
      mockOrderItemRepo.createQueryBuilder.mockReturnValue(itemQb);

      const listingQb = createMockQb();
      listingQb.getRawMany.mockResolvedValue([
        {
          seller_id: 2,
          seller_firstName: "Alice",
          active_listings: "50",
          total_listing_value: "2000",
        },
      ]);
      mockListingRepo.createQueryBuilder.mockReturnValue(listingQb);

      const result = await service.getBestSellers(10);
      expect(result).toHaveLength(1);
      expect(result[0].seller.firstName).toBe("Alice");
      expect(result[0].totalRevenue).toBe(0);
    });
  });

  describe("getSellerStatistics", () => {
    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 1,
        firstName: "Seller",
        lastName: "One",
        avatarUrl: "avatar",
        isPro: false,
        createdAt: new Date(),
      });
      listingRepo.find.mockResolvedValue([
        {
          id: 1,
          status: ListingStatus.ACTIVE,
          quantityAvailable: 2,
          expiresAt: new Date(Date.now() + 10000),
        },
      ]);
    });

    it("reports revenue computed from the seller's own lines", async () => {
      mockOrderService.getSellerRevenue.mockResolvedValue({
        totalSales: 2,
        revenueByCurrency: { EUR: 300 },
      });

      const stats = await service.getSellerStatistics(1);

      expect(stats.totalListings).toBe(1);
      expect(stats.activeListings).toBe(1);
      expect(stats.totalSales).toBe(2);
      expect(stats.totalRevenue).toBe(300);
      expect(stats.currency).toBe("EUR");
      expect(stats.avgOrderValue).toBe(150);
    });

    it("does not sum revenue across currencies", async () => {
      mockOrderService.getSellerRevenue.mockResolvedValue({
        totalSales: 3,
        revenueByCurrency: { EUR: 100, USD: 200 },
      });

      const stats = await service.getSellerStatistics(1);

      expect(stats.totalRevenue).toBeNull();
      expect(stats.currency).toBeNull();
      expect(stats.revenueByCurrency).toEqual({ EUR: 100, USD: 200 });
    });

    it("does not expose the seller email", async () => {
      await service.getSellerStatistics(1);

      const select = mockUserRepository.findOne.mock.calls[0][0].select;
      expect(select).not.toContain("email");
    });
  });

  describe("getCardsWithMarketplaceData", () => {
    it("calls query builder with correct params", async () => {
      const qb = createMockQb();
      mockPokemonCardRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getCardsWithMarketplaceData({
        search: "test",
        priceMin: 10,
        sortBy: "price",
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        "card.name ILIKE :search",
        expect.anything(),
      );
      expect(qb.having).toHaveBeenCalledWith(
        expect.stringContaining("MIN(listing.price) >= :priceMin"),
        expect.anything(),
      );
      expect(qb.orderBy).toHaveBeenCalledWith("min_price", "ASC", "NULLS LAST");
    });

    it("applies filters and fallback sorting", async () => {
      const qb = createMockQb();
      mockPokemonCardRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getCardsWithMarketplaceData({
        setId: "set1",
        serieId: "serie1",
        rarity: "rare",
        currency: "USD",
        cardState: "NM",
        priceMax: 50,
        sortBy: "unknown" as any,
      });

      expect(qb.andWhere).toHaveBeenCalledWith("set.id = :setId", {
        setId: "set1",
      });
      expect(qb.andWhere).toHaveBeenCalledWith("serie.id = :serieId", {
        serieId: "serie1",
      });
      expect(qb.andWhere).toHaveBeenCalledWith("card.rarity = :rarity", {
        rarity: "rare",
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        "(listing.currency = :currency OR listing.id IS NULL)",
        { currency: "USD" },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        "(listing.cardState = :cardState OR listing.id IS NULL)",
        { cardState: "NM" },
      );
      expect(qb.andHaving).toHaveBeenCalledWith(
        expect.stringContaining("<= :priceMax"),
        expect.objectContaining({ priceMax: 50 }),
      );
      expect(qb.orderBy).toHaveBeenCalledWith("card.name", "ASC");
    });
  });
});
