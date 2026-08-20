import { CatalogLocalizationService } from "../card/catalog-localization.service";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "../card/entities/card.entity";
import { Listing } from "../marketplace/entities/listing.entity";
import { Player } from "../player/entities/player.entity";
import { Tournament } from "../tournament/entities/tournament.entity";
import { User } from "../user/entities/user.entity";
import { SearchService } from "./search.service";

const createMockRepo = () => {
  const qb: any = {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  return {
    qb,
    repo: {
      createQueryBuilder: jest.fn(() => qb),
      find: jest.fn(),
    },
  };
};

describe("SearchService", () => {
  let service: SearchService;
  let cardMock: ReturnType<typeof createMockRepo>;
  let tournamentMock: ReturnType<typeof createMockRepo>;
  let playerMock: ReturnType<typeof createMockRepo>;
  let listingMock: ReturnType<typeof createMockRepo>;
  let userMock: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    cardMock = createMockRepo();
    tournamentMock = createMockRepo();
    playerMock = createMockRepo();
    listingMock = createMockRepo();
    userMock = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getRepositoryToken(Card), useValue: cardMock.repo },
        {
          provide: getRepositoryToken(Tournament),
          useValue: tournamentMock.repo,
        },
        { provide: getRepositoryToken(Player), useValue: playerMock.repo },
        { provide: getRepositoryToken(Listing), useValue: listingMock.repo },
        { provide: getRepositoryToken(User), useValue: userMock.repo },
        {
          provide: CatalogLocalizationService,
          useValue: {
            localize: jest.fn(async (payload) => payload),
            resolveLabels: jest.fn(async (payload) => payload),
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  describe("globalSearch", () => {
    it("should return empty results when query too short", async () => {
      const res = await service.globalSearch({ query: "a" } as any);
      expect(res.total).toBe(0);
    });

    it("should search multiple categories and sort by title / type / relevance", async () => {
      cardMock.qb.getMany.mockResolvedValue([{ id: "c1", name: "Pika" }]);
      tournamentMock.qb.getMany.mockResolvedValue([{ id: 1, name: "Cup" }]);
      playerMock.qb.getMany.mockResolvedValue([{ id: 2, nickname: "Ash" }]);
      listingMock.qb.getMany.mockResolvedValue([
        {
          id: 3,
          title: "Card",
          price: 10,
          currency: "EUR",
          cardState: "Mint",
          quantityAvailable: 1,
          pokemonCard: { name: "Pikachu", image: "img.png" },
          seller: { firstName: "John", lastName: "Doe" },
        },
      ]);

      const res = await service.globalSearch({
        query: "pi",
        limit: 5,
        sortBy: "title",
        sortOrder: "ASC",
      } as any);
      expect(res.results.length).toBeGreaterThan(0);
      expect(tournamentMock.qb.andWhere).toHaveBeenCalledWith(
        "tournament.isPublic = :isPublic",
        { isPublic: true },
      );

      const resType = await service.globalSearch({
        query: "pi",
        limit: 5,
        sortBy: "type",
      } as any);
      expect(resType.results.length).toBeGreaterThan(0);
    });
  });

  describe("getSearchSuggestions", () => {
    it("should return empty array for short query", async () => {
      const result = await service.getSearchSuggestions("x");
      expect(result).toEqual([]);
    });

    it("should return unique suggestion strings from cards and tournaments", async () => {
      cardMock.qb.getMany.mockResolvedValue([{ name: "Pikachu" }]);
      tournamentMock.qb.getMany.mockResolvedValue([
        { name: "Pikachu Tournament" },
      ]);

      const result = await service.getSearchSuggestions("pika", 5);
      expect(result).toEqual(["Pikachu", "Pikachu Tournament"]);
    });
  });

  describe("getSuggestionsPreview & getSuggestionsDetail", () => {
    it("should return empty previews and details for short query", async () => {
      expect((await service.getSuggestionsPreview("")).total).toBe(0);
      expect((await service.getSuggestionsDetail("")).total).toBe(0);
    });

    it("should return preview items across cards, tournaments, and players", async () => {
      cardMock.qb.getMany.mockResolvedValue([
        { id: "c1", name: "Pikachu", set: { name: "Base" } },
      ]);
      tournamentMock.qb.getMany.mockResolvedValue([
        { id: 1, name: "Tourney", location: "Paris" },
      ]);
      playerMock.qb.getMany.mockResolvedValue([
        { id: 2, user: { firstName: "Satoshi", lastName: "T" } },
      ]);

      const result = await service.getSuggestionsPreview("pika", 10);
      expect(result.suggestions.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it("should return detailed suggestion items with metadata", async () => {
      cardMock.qb.getMany.mockResolvedValue([
        {
          id: "c1",
          name: "Charizard",
          rarity: "Rare Holo",
          set: { name: "Base" },
          pokemonDetails: { hp: 120, types: ["Fire"] },
        },
      ]);
      tournamentMock.qb.getMany.mockResolvedValue([
        {
          id: 1,
          name: "Championship",
          status: "in_progress",
          players: [{ id: 1 }, { id: 2 }],
        },
      ]);

      const result = await service.getSuggestionsDetail("char", 10);
      expect(result.suggestions.length).toBe(2);
      expect(result.suggestions[0].metadata).toBeDefined();
    });
  });
});
