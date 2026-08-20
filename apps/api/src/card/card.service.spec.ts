import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CardGame } from "../common/enums/cardGame";
import { CardService } from "./card.service";
import { Card } from "./entities/card.entity";
import { CardTranslation } from "./entities/card-translation.entity";

describe("CardService", () => {
  let service: CardService;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  const mockCardRepo = {
    query: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockTranslationRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardService,
        {
          provide: getRepositoryToken(Card),
          useValue: mockCardRepo,
        },
        {
          provide: getRepositoryToken(CardTranslation),
          useValue: mockTranslationRepo,
        },
      ],
    }).compile();

    service = module.get<CardService>(CardService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("onModuleInit", () => {
    it("should initialize pgvector extensions and index successfully", async () => {
      mockCardRepo.query.mockResolvedValue(undefined);
      await service.onModuleInit();
      expect(mockCardRepo.query).toHaveBeenCalledTimes(3);
    });

    it("should handle error gracefully when pgvector cannot be initialized", async () => {
      mockCardRepo.query.mockRejectedValueOnce(new Error("extension error"));
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe("findByNameFuzzy", () => {
    it("should return empty array when search term is shorter than 3 characters", async () => {
      const result = await service.findByNameFuzzy("ab");
      expect(result).toEqual([]);
    });

    it("should return cards found by fuzzy trigram query", async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([{ cardId: "card-1" }]);
      const card1 = { id: "card-1", name: "Pikachu" } as Card;
      mockCardRepo.find.mockResolvedValue([card1]);

      const result = await service.findByNameFuzzy("pikach", CardGame.Pokemon);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("card-1");
    });

    it("should return empty array if no translation matched", async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      const result = await service.findByNameFuzzy("unknown-card");
      expect(result).toEqual([]);
    });
  });

  describe("findAll", () => {
    it("should find all cards without filter", async () => {
      mockCardRepo.find.mockResolvedValue([{ id: "c-1" }]);
      const result = await service.findAll();
      expect(result).toEqual([{ id: "c-1" }]);
      expect(mockCardRepo.find).toHaveBeenCalledWith({
        where: {},
        relations: ["set", "pokemonDetails"],
      });
    });

    it("should find cards filtered by game", async () => {
      mockCardRepo.find.mockResolvedValue([
        { id: "c-1", game: CardGame.Pokemon },
      ]);
      const result = await service.findAll(CardGame.Pokemon);
      expect(result).toHaveLength(1);
      expect(mockCardRepo.find).toHaveBeenCalledWith({
        where: { game: CardGame.Pokemon },
        relations: ["set", "pokemonDetails"],
      });
    });
  });

  describe("findOne", () => {
    it("should return card by ID", async () => {
      mockCardRepo.findOne.mockResolvedValue({ id: "c-1" });
      const result = await service.findOne("c-1");
      expect(result.id).toBe("c-1");
    });

    it("should throw error if card not found", async () => {
      mockCardRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne("missing")).rejects.toThrow(
        "Card with id missing not found",
      );
    });
  });

  describe("findByLocalId", () => {
    it("should return empty array if localId is empty", async () => {
      const result = await service.findByLocalId("");
      expect(result).toEqual([]);
    });

    it("should query cards by localId variants", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        { id: "c-1", localId: "025" },
      ]);
      const result = await service.findByLocalId(
        "25",
        undefined,
        CardGame.Pokemon,
      );
      expect(result).toHaveLength(1);
    });

    it("should query with total count filter when total is provided", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        { id: "c-1", localId: "025" },
      ]);
      const result = await service.findByLocalId("25", "102");
      expect(result).toHaveLength(1);
    });
  });

  describe("findByEmbedding", () => {
    it("should return empty array if embedding is empty or pgvector is not ready", async () => {
      const result = await service.findByEmbedding([]);
      expect(result).toEqual([]);
    });

    it("should query visual similarity when embedding ready", async () => {
      mockCardRepo.query.mockResolvedValue(undefined);
      await service.onModuleInit(); // ready

      mockCardRepo.query.mockResolvedValueOnce([
        { id: "c-1", similarity: "0.95" },
      ]);
      mockCardRepo.find.mockResolvedValue([{ id: "c-1" }]);

      const result = await service.findByEmbedding(
        [0.1, 0.2, 0.3],
        CardGame.Pokemon,
      );
      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBe(0.95);
    });

    it("should handle error in visual search query gracefully", async () => {
      mockCardRepo.query.mockResolvedValue(undefined);
      await service.onModuleInit();

      mockCardRepo.query.mockRejectedValueOnce(new Error("query failed"));
      const result = await service.findByEmbedding([0.1, 0.2]);
      expect(result).toEqual([]);
    });
  });

  describe("embeddingSimilarities", () => {
    it("should return empty map if embedding or ids are empty", async () => {
      const result = await service.embeddingSimilarities([], ["c-1"]);
      expect(result.size).toBe(0);
    });

    it("should calculate similarity map for card IDs", async () => {
      mockCardRepo.query.mockResolvedValue(undefined);
      await service.onModuleInit();

      mockCardRepo.query.mockResolvedValueOnce([
        { id: "c-1", similarity: "0.88" },
      ]);
      const result = await service.embeddingSimilarities([0.1, 0.2], ["c-1"]);
      expect(result.get("c-1")).toBe(0.88);
    });

    it("should handle error in embedding similarities gracefully", async () => {
      mockCardRepo.query.mockResolvedValue(undefined);
      await service.onModuleInit();

      mockCardRepo.query.mockRejectedValueOnce(new Error("error"));
      const result = await service.embeddingSimilarities([0.1, 0.2], ["c-1"]);
      expect(result.size).toBe(0);
    });
  });

  describe("findBySearch", () => {
    it("should return empty array if search is empty", async () => {
      const result = await service.findBySearch("");
      expect(result).toEqual([]);
    });

    it("should find cards matching search", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([{ id: "c-1" }]);
      const result = await service.findBySearch("Pikachu", CardGame.Pokemon);
      expect(result).toEqual([{ id: "c-1" }]);
    });
  });

  describe("findAllPaginated", () => {
    it("should return paginated result", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ id: "c-1" }], 1]);
      const result = await service.findAllPaginated(1, 10, CardGame.Pokemon);
      expect(result.data).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });
  });

  describe("findRandom", () => {
    it("should return random card or null", async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ id: "c-rand" });
      const result = await service.findRandom(CardGame.Pokemon);
      expect(result).toEqual({ id: "c-rand" });
    });
  });

  describe("getSetRarities", () => {
    it("should return unique rarities for set in default locale", async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { rarity: "Common" },
        { rarity: "Rare" },
      ]);
      const result = await service.getSetRarities("set-1", "fr");
      expect(result).toEqual(["Common", "Rare"]);
    });

    it("should fallback to default locale if non-default returns empty", async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ rarity: "Rare Holo" }]);

      const result = await service.getSetRarities("set-1", "en");
      expect(result).toEqual(["Rare Holo"]);
    });
  });
});
