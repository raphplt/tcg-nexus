import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "../card/entities/card.entity";
import { DeckService } from "../deck/deck.service";
import { DeckFormat } from "../deck-format/entities/deck-format.entity";
import { AiService } from "./ai.service";
import { DeckMetricsService } from "./engine/deck-metrics.service";
import { DeckSimilarityService } from "./similarity/deck-similarity.service";

describe("AiService", () => {
  let service: AiService;
  let cardRepository: any;
  let formatRepository: any;
  let deckService: any;
  let deckMetricsService: any;
  let deckSimilarityService: any;

  beforeEach(async () => {
    cardRepository = {
      find: jest.fn(),
    };
    formatRepository = {
      findOneBy: jest.fn(),
    };
    deckService = {
      findOneWithCards: jest.fn(),
    };
    deckMetricsService = {
      analyze: jest.fn(),
    };
    deckSimilarityService = {
      refreshDeckEmbedding: jest.fn(),
      findSimilarDecks: jest.fn(),
      suggestCards: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: getRepositoryToken(Card), useValue: cardRepository },
        { provide: getRepositoryToken(DeckFormat), useValue: formatRepository },
        { provide: DeckService, useValue: deckService },
        { provide: DeckMetricsService, useValue: deckMetricsService },
        { provide: DeckSimilarityService, useValue: deckSimilarityService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("analyzePool", () => {
    it("throws BadRequestException when no submitted cards are found", async () => {
      cardRepository.find.mockResolvedValue([]);

      await expect(
        service.analyzePool({
          cards: [{ cardId: "unknown-1", qty: 2 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("aggregates duplicate entries and calls deckMetrics.analyze", async () => {
      const mockCard = { id: "card-1", name: "Pikachu" } as Card;
      cardRepository.find.mockResolvedValue([mockCard]);
      formatRepository.findOneBy.mockResolvedValue({ id: 1, type: "standard" });
      deckMetricsService.analyze.mockResolvedValue({ totalCards: 3 } as any);

      const result = await service.analyzePool(
        {
          cards: [
            { cardId: "card-1", qty: 2 },
            { cardId: "card-1", qty: 1 },
          ],
          formatId: 1,
        },
        "en",
      );

      expect(cardRepository.find).toHaveBeenCalled();
      expect(deckMetricsService.analyze).toHaveBeenCalledWith(
        [{ card: mockCard, qty: 3 }],
        { formatId: 1, formatType: "standard", locale: "en" },
      );
      expect(result).toEqual({ totalCards: 3 });
    });
  });

  describe("findSimilarDecks", () => {
    it("checks deck visibility, refreshes embeddings and queries similar decks", async () => {
      const mockUser = { id: 1 } as any;
      deckService.findOneWithCards.mockResolvedValue({ id: 10 });
      deckSimilarityService.findSimilarDecks.mockResolvedValue({
        available: true,
        items: [{ deckId: 12, similarity: 0.95 }],
      });

      const result = await service.findSimilarDecks(10, mockUser, 5);

      expect(deckService.findOneWithCards).toHaveBeenCalledWith(10, mockUser);
      expect(deckSimilarityService.refreshDeckEmbedding).toHaveBeenCalledWith(
        10,
      );
      expect(deckSimilarityService.findSimilarDecks).toHaveBeenCalledWith(
        10,
        5,
      );
      expect(result.items).toHaveLength(1);
    });
  });

  describe("suggestCards", () => {
    it("checks deck visibility and returns card suggestions", async () => {
      deckService.findOneWithCards.mockResolvedValue({ id: 10 });
      deckSimilarityService.suggestCards.mockResolvedValue({
        available: true,
        items: [{ cardId: "c1", adoption: 80 }],
      });

      const result = await service.suggestCards(10, undefined, 8, "fr");

      expect(deckService.findOneWithCards).toHaveBeenCalledWith(10, undefined);
      expect(deckSimilarityService.refreshDeckEmbedding).toHaveBeenCalledWith(
        10,
      );
      expect(deckSimilarityService.suggestCards).toHaveBeenCalledWith(
        10,
        8,
        "fr",
      );
      expect(result.items).toHaveLength(1);
    });
  });
});
