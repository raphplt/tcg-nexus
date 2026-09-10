import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { UserRole } from "src/common/enums/user";
import { DeckMetricsService } from "../ai/engine/deck-metrics.service";
import { CatalogLocalizationService } from "../card/catalog-localization.service";
import { Card } from "../card/entities/card.entity";
import { DeckCardRole } from "../common/enums/deckCardRole";
import { DeckCard } from "../deck-card/entities/deck-card.entity";
import { DeckFormat } from "../deck-format/entities/deck-format.entity";
import { PaginationHelper } from "../helpers/pagination";
import { DeckService } from "./deck.service";
import { DeckSortBy, SortOrder } from "./dto/find-all-decks-query.dto";
import { Deck } from "./entities/deck.entity";
import { DeckShare } from "./entities/deck-share.entity";
import { SavedDeck } from "./entities/saved-deck.entity";

describe("DeckService", () => {
  let service: DeckService;
  let deckCardRepo: any;
  let pokemonCardRepo: any;
  let deckFormatRepo: any;
  let deckRepo: any;
  let deckShareRepo: any;
  let savedDeckRepo: any;

  const createQueryBuilderMock = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
  });

  const metricsService = { analyze: jest.fn() };

  beforeEach(async () => {
    deckCardRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
    };

    pokemonCardRepo = {
      findBy: jest.fn(),
      findOneBy: jest.fn(),
    };

    deckFormatRepo = {
      findOneBy: jest.fn(),
    };

    deckRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
      increment: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    deckShareRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };

    savedDeckRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      findOne: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeckService,
        {
          provide: getRepositoryToken(DeckCard),
          useValue: deckCardRepo,
        },
        {
          provide: getRepositoryToken(Card),
          useValue: pokemonCardRepo,
        },
        {
          provide: getRepositoryToken(DeckFormat),
          useValue: deckFormatRepo,
        },
        {
          provide: getRepositoryToken(Deck),
          useValue: deckRepo,
        },
        {
          provide: getRepositoryToken(DeckShare),
          useValue: deckShareRepo,
        },
        {
          provide: getRepositoryToken(SavedDeck),
          useValue: savedDeckRepo,
        },
        {
          provide: CatalogLocalizationService,
          useValue: {
            localize: jest.fn(async (payload) => payload),
            resolveLabels: jest.fn(async (payload) => payload),
          },
        },
        {
          provide: DeckMetricsService,
          useValue: metricsService,
        },
      ],
    }).compile();

    service = module.get<DeckService>(DeckService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createDeck", () => {
    it("creates a deck with cards and sets a cover card", async () => {
      deckFormatRepo.findOneBy.mockResolvedValue({ id: "fmt1" });
      const cardMap: Record<string, any> = {
        c1: { id: "c1", name: "First" },
        c2: { id: "c2", name: "Second" },
      };
      pokemonCardRepo.findBy.mockResolvedValue(Object.values(cardMap));
      const createdDeck = { id: 1, name: "Deck" };
      deckRepo.create.mockReturnValue(createdDeck);
      const expectedDeck = { ...createdDeck, cards: [] };
      deckRepo.findOne.mockResolvedValue(expectedDeck);

      const dto = {
        deckName: "My deck",
        isPublic: true,
        formatId: "fmt1",
        cards: [
          { cardId: "c1", qty: 2, role: DeckCardRole.main },
          { cardId: "c2", qty: 1, role: DeckCardRole.side },
        ],
      } as any;

      const result = await service.createDeck({ id: 10 } as any, dto);

      expect(deckRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My deck",
          coverCard: cardMap.c1,
        }),
      );
      expect(pokemonCardRepo.findBy).toHaveBeenCalledTimes(1);
      expect(deckCardRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ card: cardMap.c1, qty: 2 }),
          expect.objectContaining({ card: cardMap.c2, qty: 1 }),
        ]),
      );
      expect(result).toEqual(expectedDeck);
    });

    it("throws when format is missing", async () => {
      deckFormatRepo.findOneBy.mockResolvedValue(null);
      await expect(
        service.createDeck(
          {} as any,
          {
            formatId: "missing",
            cards: [],
          } as any,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws when a card is missing", async () => {
      deckFormatRepo.findOneBy.mockResolvedValue({ id: "fmt" });
      pokemonCardRepo.findBy.mockResolvedValue([]);

      await expect(
        service.createDeck(
          {} as any,
          {
            formatId: "fmt",
            cards: [{ cardId: "missing", qty: 1, role: DeckCardRole.main }],
          } as any,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(deckCardRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("findAll / findAllFromUser", () => {
    it("applies filters when finding all public decks", async () => {
      const qb = createQueryBuilderMock();
      deckRepo.createQueryBuilder.mockReturnValue(qb);
      jest
        .spyOn(PaginationHelper, "paginateQueryBuilder")
        .mockResolvedValue({ data: [], meta: {} } as any);

      const result = await service.findAll({
        formatId: "3",
        search: "fire",
        sortBy: DeckSortBy.FORMAT_TYPE,
        sortOrder: SortOrder.ASC,
        page: 2,
        limit: 5,
      });

      expect(qb.andWhere).toHaveBeenCalledWith("format.id = :formatId", {
        formatId: "3",
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        "LOWER(deck.name) LIKE LOWER(:search)",
        { search: "%fire%" },
      );
      expect(PaginationHelper.paginateQueryBuilder).toHaveBeenCalledWith(
        qb,
        { page: 2, limit: 5 },
        "format.type",
        "ASC",
      );
      expect(result.data).toEqual([]);
    });

    it("filters by user and uses deck fields for ordering", async () => {
      const qb = createQueryBuilderMock();
      deckRepo.createQueryBuilder.mockReturnValue(qb);
      jest
        .spyOn(PaginationHelper, "paginateQueryBuilder")
        .mockResolvedValue({ data: [], meta: {} } as any);

      const user = { id: 5 } as any;
      const result = await service.findAllFromUser(user, {
        sortBy: DeckSortBy.NAME,
      });

      expect(qb.andWhere).toHaveBeenCalledWith("user.id = :userId", {
        userId: 5,
      });
      expect(PaginationHelper.paginateQueryBuilder).toHaveBeenCalledWith(
        qb,
        { page: 1, limit: 20 },
        "deck.name",
        "DESC",
      );
      expect(result.data).toEqual([]);
    });
  });

  describe("findOneWithCards", () => {
    it("throws when deck is missing", async () => {
      deckRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneWithCards(42)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("returns the deck when found", async () => {
      const deck = { id: 1, isPublic: true } as any;
      deckRepo.findOne.mockResolvedValue(deck);

      const result = await service.findOneWithCards(1);

      expect(result).toBe(deck);
    });

    it("hides a private deck from anonymous viewers", async () => {
      deckRepo.findOne.mockResolvedValue({
        id: 1,
        isPublic: false,
        user: { id: 7 },
      });

      await expect(service.findOneWithCards(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("hides a private deck from another user", async () => {
      deckRepo.findOne.mockResolvedValue({
        id: 1,
        isPublic: false,
        user: { id: 7 },
      });

      await expect(
        service.findOneWithCards(1, { id: 8, role: UserRole.USER } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns a private deck to its owner", async () => {
      const deck = { id: 1, isPublic: false, user: { id: 7 } } as any;
      deckRepo.findOne.mockResolvedValue(deck);

      await expect(
        service.findOneWithCards(1, { id: 7, role: UserRole.USER } as any),
      ).resolves.toBe(deck);
    });
  });
  describe("analyzeDeck", () => {
    // Composition rules moved to DeckMetricsService and are covered by
    // src/ai/engine/deck-metrics.service.spec.ts. What stays here is the
    // contract this service still owns: load, check visibility, delegate.
    it("delegates the analysis to the deck metrics engine", async () => {
      const deck = {
        id: 1,
        isPublic: true,
        format: { id: 3, type: "Standard" },
        cards: [{ qty: 4, card: { id: "p1" } }],
      };
      deckRepo.findOne.mockResolvedValue(deck);
      metricsService.analyze.mockResolvedValue({ deckId: 1, totalCards: 4 });

      const result = await service.analyzeDeck(1, undefined, "fr");

      expect(metricsService.analyze).toHaveBeenCalledWith(
        [{ card: { id: "p1" }, qty: 4 }],
        { deckId: 1, formatId: 3, formatType: "Standard", locale: "fr" },
      );
      expect(result).toEqual({ deckId: 1, totalCards: 4 });
    });
  });

  describe("updateDeck", () => {
    const baseDto = {
      cardsToAdd: [],
      cardsToUpdate: [],
      cardsToRemove: [],
    } as any;

    it("throws when deck is missing", async () => {
      deckRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateDeck(1, { id: 1 } as any, baseDto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws when format is missing", async () => {
      deckRepo.findOne.mockResolvedValue({ id: 1, cards: [], user: { id: 1 } });
      deckFormatRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateDeck(1, { id: 1 } as any, {
          ...baseDto,
          formatId: "missing",
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws when a card to add is missing", async () => {
      deckRepo.findOne.mockResolvedValue({ id: 1, cards: [], user: { id: 1 } });
      deckFormatRepo.findOneBy.mockResolvedValue({ id: "fmt" });
      pokemonCardRepo.findBy.mockResolvedValue([]);

      await expect(
        service.updateDeck(1, { id: 1 } as any, {
          ...baseDto,
          formatId: "fmt",
          cardsToAdd: [{ cardId: "missing", qty: 1, role: DeckCardRole.main }],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws when a card to update is missing", async () => {
      deckRepo.findOne.mockResolvedValue({ id: 1, cards: [], user: { id: 1 } });
      deckFormatRepo.findOneBy.mockResolvedValue({ id: "fmt" });
      pokemonCardRepo.findBy.mockResolvedValue([{ id: "c1" }]);
      deckCardRepo.find.mockResolvedValue([]);

      await expect(
        service.updateDeck(1, { id: 1 } as any, {
          ...baseDto,
          formatId: "fmt",
          cardsToAdd: [{ cardId: "c1", qty: 1, role: DeckCardRole.main }],
          cardsToUpdate: [{ id: 99, qty: 3 }],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("updates fields and cards", async () => {
      const deck = {
        id: 1,
        name: "Old",
        isPublic: false,
        cards: [],
        user: { id: 1 },
      };
      deckRepo.findOne.mockResolvedValue(deck);
      deckFormatRepo.findOneBy.mockResolvedValue({ id: "fmt2" });
      pokemonCardRepo.findBy.mockResolvedValue([{ id: "card-add" }]);
      deckCardRepo.find
        .mockResolvedValueOnce([{ id: 2 }])
        .mockResolvedValueOnce([
          {
            id: 5,
            qty: 1,
            role: DeckCardRole.main,
          },
        ]);
      const updatedDeck = { ...deck, name: "New", isPublic: true };
      deckRepo.findOne
        .mockResolvedValueOnce(deck)
        .mockResolvedValueOnce(updatedDeck);

      const result = await service.updateDeck(
        1,
        { id: 1 } as any,
        {
          deckName: "New",
          isPublic: true,
          formatId: "fmt2",
          cardsToRemove: [{ id: 2 }],
          cardsToAdd: [{ cardId: "card-add", qty: 2, role: DeckCardRole.side }],
          cardsToUpdate: [{ id: 5, qty: 4, role: DeckCardRole.main }],
        } as any,
      );

      expect(deck.name).toBe("New");
      expect(deck.isPublic).toBe(true);
      expect(deckCardRepo.delete).toHaveBeenCalledWith([2]);
      expect(deckCardRepo.save).toHaveBeenCalled();
      expect(result).toEqual(updatedDeck);
    });

    it("keeps deck when no card changes are provided", async () => {
      const deck = {
        id: 2,
        name: "Name",
        isPublic: false,
        cards: [],
        user: { id: 1 },
      };
      deckRepo.findOne.mockResolvedValue(deck);
      deckRepo.findOne.mockResolvedValueOnce(deck).mockResolvedValueOnce(deck);

      const result = await service.updateDeck(2, { id: 1 } as any, {
        ...baseDto,
        deckName: "Updated",
      });

      expect(deck.name).toBe("Updated");
      expect(deckCardRepo.delete).not.toHaveBeenCalled();
      expect(result).toEqual(deck);
    });
  });

  describe("remove", () => {
    const owner = { id: 1, role: UserRole.USER } as any;

    it("throws when deck does not exist", async () => {
      deckRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(1, owner)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("removes deck owned by the user", async () => {
      const deck = { id: 1, name: "Demo", user: { id: 1 } };
      deckRepo.findOne.mockResolvedValue(deck);

      const result = await service.remove(1, owner);

      expect(deckRepo.remove).toHaveBeenCalledWith(deck);
      expect(result).toEqual({ message: "Deck Demo supprimé avec succès" });
    });

    it("refuses to delete a deck owned by someone else", async () => {
      const deck = { id: 1, name: "Demo", user: { id: 42 } };
      deckRepo.findOne.mockResolvedValue(deck);

      await expect(service.remove(1, owner)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(deckRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe("cloneDeck", () => {
    it("throws when deck is not found", async () => {
      deckRepo.findOne.mockResolvedValue(null);
      await expect(
        service.cloneDeck(1, { id: 1 } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws when user is not allowed", async () => {
      deckRepo.findOne.mockResolvedValue({
        id: 1,
        user: { id: 2 },
        cards: [],
      });

      await expect(
        service.cloneDeck(1, { id: 1, role: UserRole.USER } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("clones deck for authorized user", async () => {
      const deck = {
        id: 1,
        name: "Base",
        isPublic: true,
        user: { id: 1 },
        format: { id: "fmt" },
        cards: [
          { card: { id: "c1" }, qty: 2, role: DeckCardRole.main },
          { card: { id: "c2" }, qty: 1, role: DeckCardRole.side },
        ],
      };
      deckRepo.findOne.mockResolvedValue(deck);
      deckRepo.create.mockReturnValue({ id: 2, name: "Base (copy)" });
      deckRepo.save.mockResolvedValue({ id: 2 });
      deckRepo.findOne
        .mockResolvedValueOnce(deck)
        .mockResolvedValueOnce({ ...deck, id: 2 });

      const result = await service.cloneDeck(1, { id: 1 } as any);

      expect(deckCardRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ deck: { id: 2 }, card: { id: "c1" } }),
        ]),
      );
      expect(result.id).toBe(2);
    });

    it("clones a public deck for another user", async () => {
      const deck = {
        id: 1,
        name: "Community Deck",
        isPublic: true,
        user: { id: 99 },
        format: { id: "fmt" },
        cards: [],
      };
      deckRepo.findOne.mockResolvedValue(deck);
      deckRepo.create.mockReturnValue({ id: 3, name: "Community Deck (copy)" });
      deckRepo.save.mockResolvedValue({ id: 3 });
      deckRepo.findOne
        .mockResolvedValueOnce(deck)
        .mockResolvedValueOnce({ ...deck, id: 3 });

      const result = await service.cloneDeck(1, {
        id: 1,
        role: UserRole.USER,
      } as any);
      expect(result.id).toBe(3);
    });
  });

  describe("incrementViews", () => {
    it("increments the counter", async () => {
      await service.incrementViews(1);
      expect(deckRepo.increment).toHaveBeenCalledWith({ id: 1 }, "views", 1);
    });
  });

  describe("shareDeck", () => {
    it("throws when deck is missing", async () => {
      deckRepo.findOne.mockResolvedValue(null);
      await expect(
        service.shareDeck(1, { id: 1 } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("generates a unique share code", async () => {
      deckRepo.findOne.mockResolvedValue({ id: 1, user: { id: 1 } });
      deckShareRepo.findOneBy
        .mockResolvedValueOnce({ code: "DUPLICATE" })
        .mockResolvedValueOnce(null);

      const result = await service.shareDeck(1, { id: 1 } as any, {
        expiresAt: "2025-01-01",
      });

      expect(deckShareRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deck: { id: 1, user: { id: 1 } },
          expiresAt: new Date("2025-01-01"),
        }),
      );
      expect(result.code).toHaveLength(8);
    });
  });

  describe("importDeck", () => {
    it("throws when code is invalid", async () => {
      deckShareRepo.findOne.mockResolvedValue(null);
      await expect(
        service.importDeck("invalid", {} as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws when code is expired", async () => {
      deckShareRepo.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.importDeck("old", {} as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("clones the shared deck", async () => {
      const sharedDeck = {
        id: 3,
        name: "Shared",
        isPublic: true,
        user: { id: 10 },
        format: { id: "fmt" },
        cards: [{ card: { id: "c1" }, qty: 1, role: DeckCardRole.main }],
      };
      deckShareRepo.findOne.mockResolvedValue({
        code: "CODE",
        deck: sharedDeck,
        expiresAt: null,
      });
      deckRepo.create.mockReturnValue({ id: 4, name: "Shared" });
      deckRepo.save.mockResolvedValue({ id: 4 });
      deckRepo.findOne.mockResolvedValue({ ...sharedDeck, id: 4 });

      const result = await service.importDeck("CODE", { id: 2 } as any);

      expect(deckCardRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ deck: { id: 4 } })]),
      );
      expect(result.id).toBe(4);
    });
  });

  describe("getDeckForImport", () => {
    it("throws when code is invalid", async () => {
      deckShareRepo.findOne.mockResolvedValue(null);
      await expect(service.getDeckForImport("oops")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("throws when code is expired", async () => {
      deckShareRepo.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.getDeckForImport("old")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("returns the shared deck", async () => {
      const deck = { id: 9 };
      deckShareRepo.findOne.mockResolvedValue({
        deck,
        expiresAt: null,
      });

      const result = await service.getDeckForImport("valid");

      expect(result).toBe(deck);
    });
  });

  describe("findPublicDecksByUser", () => {
    it("queries decks by user id and isPublic = true", async () => {
      const fake = [{ id: 1, name: "D" }];
      deckRepo.findAndCount.mockResolvedValue([fake, 1]);
      const result = await service.findPublicDecksByUser(7, {
        page: 1,
        limit: 20,
      });
      expect(result.items).toEqual(fake);
      expect(result.total).toBe(1);
      expect(deckRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user: { id: 7 }, isPublic: true },
        }),
      );
    });
  });
});
