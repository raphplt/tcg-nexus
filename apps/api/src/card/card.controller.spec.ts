import { Test, TestingModule } from "@nestjs/testing";
import { CardGame } from "../common/enums/cardGame";
import { CardController } from "./card.controller";
import { CardService } from "./card.service";
import type { SupportedLocale } from "src/translation/supported-locales";

describe("CardController", () => {
  let controller: CardController;
  let service: jest.Mocked<CardService>;

  const mockCardService = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findBySearch: jest.fn(),
    findRandom: jest.fn(),
    getSetRarities: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardController],
      providers: [
        {
          provide: CardService,
          useValue: mockCardService,
        },
      ],
    }).compile();

    controller = module.get<CardController>(CardController);
    service = module.get(CardService);
  });

  describe("findAll", () => {
    it("should return all cards for a specific game", async () => {
      const mockCards = [{ id: "card-1", name: "Pikachu" }] as any;
      mockCardService.findAll.mockResolvedValue(mockCards);

      const result = await controller.findAll(CardGame.Pokemon);

      expect(service.findAll).toHaveBeenCalledWith(CardGame.Pokemon);
      expect(result).toBe(mockCards);
    });

    it("should return all cards without game filter if not provided", async () => {
      mockCardService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(undefined);

      expect(service.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([]);
    });
  });

  describe("findAllPaginated", () => {
    it("should return paginated cards with page and limit", async () => {
      const mockPaginated = {
        data: [{ id: "card-1" }],
        meta: { total: 1, page: 1, limit: 10 },
      } as any;
      mockCardService.findAllPaginated.mockResolvedValue(mockPaginated);

      const result = await controller.findAllPaginated(1, 10, CardGame.Pokemon);

      expect(service.findAllPaginated).toHaveBeenCalledWith(
        1,
        10,
        CardGame.Pokemon,
      );
      expect(result).toBe(mockPaginated);
    });
  });

  describe("findBySearch", () => {
    it("should search cards by search term and game filter", async () => {
      const mockCards = [{ id: "card-1", name: "Charizard" }] as any;
      mockCardService.findBySearch.mockResolvedValue(mockCards);

      const result = await controller.findBySearch(
        "Charizard",
        CardGame.Pokemon,
      );

      expect(service.findBySearch).toHaveBeenCalledWith(
        "Charizard",
        CardGame.Pokemon,
      );
      expect(result).toBe(mockCards);
    });
  });

  describe("findRandom", () => {
    it("should return a random card", async () => {
      const mockCard = { id: "card-random", name: "Mew" } as any;
      mockCardService.findRandom.mockResolvedValue(mockCard);

      const result = await controller.findRandom(CardGame.Pokemon);

      expect(service.findRandom).toHaveBeenCalledWith(CardGame.Pokemon);
      expect(result).toBe(mockCard);
    });
  });

  describe("getSetRarities", () => {
    it("should return set rarities for a given set and locale", async () => {
      const mockRarities = ["Common", "Rare", "Ultra Rare"];
      mockCardService.getSetRarities.mockResolvedValue(mockRarities);

      const locale: SupportedLocale = "fr";
      const result = await controller.getSetRarities("sv3", locale);

      expect(service.getSetRarities).toHaveBeenCalledWith("sv3", locale);
      expect(result).toBe(mockRarities);
    });
  });

  describe("findOne", () => {
    it("should return a single card by its ID", async () => {
      const mockCard = { id: "card-123", name: "Gengar" } as any;
      mockCardService.findOne.mockResolvedValue(mockCard);

      const result = await controller.findOne("card-123");

      expect(service.findOne).toHaveBeenCalledWith("card-123");
      expect(result).toBe(mockCard);
    });
  });
});
