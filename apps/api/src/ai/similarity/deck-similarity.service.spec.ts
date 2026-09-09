import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Deck } from "../../deck/entities/deck.entity";
import { DeckSimilarityService } from "./deck-similarity.service";

describe("DeckSimilarityService", () => {
  let service: DeckSimilarityService;
  const deckRepository = { query: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeckSimilarityService,
        { provide: getRepositoryToken(Deck), useValue: deckRepository },
      ],
    }).compile();

    service = module.get(DeckSimilarityService);
  });

  afterEach(() => jest.resetAllMocks());

  describe("graceful degradation", () => {
    it("reports pgvector as missing instead of failing the request", async () => {
      deckRepository.query.mockRejectedValue(
        new Error('relation "deck_embedding" does not exist'),
      );

      const result = await service.findSimilarDecks(1);

      expect(result).toEqual({
        available: false,
        reason: "pgvector-missing",
        items: [],
      });
    });

    it("reports a missing vector type as missing infrastructure", async () => {
      deckRepository.query.mockRejectedValue(
        new Error('type "vector" does not exist'),
      );

      const result = await service.suggestCards(1);

      expect(result.available).toBe(false);
      expect(result.reason).toBe("pgvector-missing");
    });

    it("returns an empty result rather than throwing on any other failure", async () => {
      deckRepository.query.mockRejectedValue(new Error("connection reset"));

      const result = await service.findSimilarDecks(1);

      expect(result).toEqual({
        available: false,
        reason: "deck-not-vectorized",
        items: [],
      });
    });

    it("skips the recompute while the stored vector matches the deck", async () => {
      deckRepository.query.mockResolvedValue([
        { covered_cards: 58, card_count: 60 },
      ]);

      const result = await service.refreshDeckEmbedding(3);

      expect(result).toEqual({
        stored: true,
        coveredCards: 58,
        cardCount: 60,
      });
      // Only the freshness probe ran: no INSERT on a read path.
      expect(deckRepository.query).toHaveBeenCalledTimes(1);
    });

    it("does not throw when a deck cannot be vectorized", async () => {
      deckRepository.query.mockRejectedValue(new Error("boom"));

      await expect(service.refreshDeckEmbedding(1)).resolves.toEqual({
        stored: false,
        coveredCards: 0,
        cardCount: 0,
      });
    });
  });

  describe("findSimilarDecks", () => {
    it("maps rows and rounds the cosine similarity", async () => {
      deckRepository.query.mockResolvedValue([
        {
          deck_id: "7",
          name: "Rain Dance",
          card_count: "60",
          similarity: 0.912345,
        },
      ]);

      const result = await service.findSimilarDecks(1, 5);

      expect(result.available).toBe(true);
      expect(result.items).toEqual([
        { deckId: 7, name: "Rain Dance", similarity: 0.9123, cardCount: 60 },
      ]);
    });

    it("says so explicitly when a vectorized deck has no neighbours", async () => {
      deckRepository.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ "?column?": 1 }]);

      const result = await service.findSimilarDecks(1);

      expect(result).toEqual({
        available: true,
        reason: "no-neighbours",
        items: [],
      });
    });

    it("distinguishes a deck that was never vectorized from one with no neighbours", async () => {
      deckRepository.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.findSimilarDecks(1);

      expect(result).toEqual({
        available: false,
        reason: "deck-not-vectorized",
        items: [],
      });
    });
  });

  describe("suggestCards", () => {
    it("expresses adoption as a share of the neighbours mined", async () => {
      deckRepository.query.mockResolvedValue([
        {
          card_id: "c1",
          name: "Professeur Chen",
          image: "https://cdn/c1",
          deck_count: 15,
          average_qty: 3.6666,
          neighbour_count: 20,
        },
      ]);

      const result = await service.suggestCards(1, 12, "fr");

      expect(result.items).toEqual([
        {
          cardId: "c1",
          name: "Professeur Chen",
          image: "https://cdn/c1",
          deckCount: 15,
          adoption: 75,
          averageQty: 3.7,
        },
      ]);
    });

    it("resolves card names in the requested locale", async () => {
      deckRepository.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.suggestCards(4, 8, "en");

      expect(deckRepository.query).toHaveBeenCalledWith(
        expect.stringContaining("card_translation"),
        [4, 25, 8, "en"],
      );
    });
  });
});
