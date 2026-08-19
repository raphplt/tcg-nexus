import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Listing } from "src/marketplace/entities/listing.entity";
import { PriceHistory } from "src/marketplace/entities/price-history.entity";
import {
  SealedEvent,
  SealedEventType,
} from "src/marketplace/entities/sealed-event.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { DataSource } from "typeorm";
import { SealedProductFilterDto, SealedSortBy } from "./dto/sealed-product-filter.dto";
import { SealedProduct } from "./entities/sealed-product.entity";
import { SealedProductLocale } from "./entities/sealed-product-locale.entity";
import { SealedProductType } from "./enums/sealed-product-type.enum";
import { SealedProductService } from "./sealed-product.service";

describe("SealedProductService", () => {
  let service: SealedProductService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    andHaving: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    getCount: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ id: "sp-1" }], 1]),
  };

  const mockSealedProductRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn((entity) => Promise.resolve(entity)),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockPokemonSetRepo = {
    find: jest.fn(),
  };

  const mockListingRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockPriceHistoryRepo = {
    find: jest.fn(),
  };

  const mockSealedEventRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockEntityManager = {
    create: jest.fn((entityClass, data) => data),
    save: jest.fn((entity) => Promise.resolve(entity)),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    getRepository: jest.fn(() => mockSealedProductRepo),
  };

  const mockDataSource = {
    transaction: jest.fn((cb) => cb(mockEntityManager)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SealedProductService,
        {
          provide: getRepositoryToken(SealedProduct),
          useValue: mockSealedProductRepo,
        },
        {
          provide: getRepositoryToken(PokemonSet),
          useValue: mockPokemonSetRepo,
        },
        {
          provide: getRepositoryToken(Listing),
          useValue: mockListingRepo,
        },
        {
          provide: getRepositoryToken(PriceHistory),
          useValue: mockPriceHistoryRepo,
        },
        {
          provide: getRepositoryToken(SealedEvent),
          useValue: mockSealedEventRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<SealedProductService>(SealedProductService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a sealed product with locales in transaction", async () => {
      const dto = {
        id: "sp-1",
        productType: SealedProductType.BOOSTER,
        pokemonSetId: "set-1",
        locales: [{ locale: "en" as const, name: "Booster Box" }],
      };

      mockSealedProductRepo.findOne.mockResolvedValue({
        id: "sp-1",
        productType: SealedProductType.BOOSTER,
      });

      const result = await service.create(dto as any);
      expect(result.id).toBe("sp-1");
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
    });
  });

  describe("findAll & findAllPaginated", () => {
    it("should return filtered list of sealed products", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([{ id: "sp-1" }]);
      const filter: SealedProductFilterDto = {
        search: "Pikachu",
        setId: "set-1",
        seriesId: "serie-1",
        productType: SealedProductType.BOOSTER,
        sortBy: SealedSortBy.POPULARITY,
        priceMin: 10,
        priceMax: 100,
      };

      const result = await service.findAll(filter);
      expect(result).toHaveLength(1);
    });

    it("should return paginated sealed products", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([{ id: "sp-1" }]);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.findAllPaginated({
        page: 1,
        limit: 10,
        sortBy: SealedSortBy.PRICE_ASC,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });
  });

  describe("findRecent & findPopular", () => {
    it("should return recent sealed products", async () => {
      mockSealedProductRepo.find.mockResolvedValue([{ id: "sp-1" }]);
      const result = await service.findRecent(5);
      expect(result).toHaveLength(1);
    });

    it("should return popular sealed products calculated from event scores", async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { sealedProductId: "sp-1", eventType: SealedEventType.SALE, count: "2" },
      ]);
      mockSealedProductRepo.find.mockResolvedValue([{ id: "sp-1" }]);

      const result = await service.findPopular(5);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("sp-1");
    });

    it("should fallback to findRecent if no events recorded", async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockSealedProductRepo.find.mockResolvedValue([{ id: "sp-recent" }]);

      const result = await service.findPopular(5);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("sp-recent");
    });
  });

  describe("findOne & getStatistics", () => {
    it("should return single sealed product", async () => {
      mockSealedProductRepo.findOne.mockResolvedValue({ id: "sp-1" });
      const result = await service.findOne("sp-1");
      expect(result.id).toBe("sp-1");
    });

    it("should throw NotFoundException if product does not exist", async () => {
      mockSealedProductRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
    });

    it("should compute market statistics and price history", async () => {
      mockSealedProductRepo.findOne.mockResolvedValue({ id: "sp-1" });
      mockQueryBuilder.getRawOne.mockResolvedValue({
        totalListings: "5",
        totalStock: "10",
        minPrice: "50",
        maxPrice: "70",
        avgPrice: "60",
      });
      mockPriceHistoryRepo.find.mockResolvedValue([
        { price: 60, currency: "EUR", recordedAt: new Date() },
      ]);

      const result = await service.getStatistics("sp-1");
      expect(result.sealedProductId).toBe("sp-1");
      expect(result.totalListings).toBe(5);
      expect(result.avgPrice).toBe(60);
      expect(result.priceHistory).toHaveLength(1);
    });
  });

  describe("update & remove", () => {
    it("should update sealed product and locales", async () => {
      const existing = { id: "sp-1", productType: SealedProductType.BOOSTER };
      mockSealedProductRepo.findOne.mockResolvedValue(existing);

      const result = await service.update("sp-1", {
        productType: SealedProductType.ETB,
        locales: [{ locale: "en" as const, name: "ETB" }],
      });

      expect(result).toBeDefined();
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it("should remove sealed product", async () => {
      mockSealedProductRepo.delete.mockResolvedValue({ affected: 1 });
      await service.remove("sp-1");
      expect(mockSealedProductRepo.delete).toHaveBeenCalledWith({ id: "sp-1" });
    });

    it("should throw NotFoundException if delete affects 0 rows", async () => {
      mockSealedProductRepo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove("sp-missing")).rejects.toThrow(NotFoundException);
    });
  });
});
