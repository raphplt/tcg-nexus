import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { PokemonCardDetails } from "src/card/entities/pokemon-card-details.entity";
import { CardGame } from "src/common/enums/cardGame";
import { PokemonCardService } from "./pokemon-card.service";

describe("PokemonCardService", () => {
  let service: PokemonCardService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getCount: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockDetailsRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PokemonCardService,
        {
          provide: getRepositoryToken(Card),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(PokemonCardDetails),
          useValue: mockDetailsRepository,
        },
      ],
    }).compile();

    service = module.get<PokemonCardService>(PokemonCardService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create and return a new pokemon card with details using set.id", async () => {
      const dto = {
        set: { id: "set-1" } as any,
        category: "Pokemon",
        hp: 100,
        types: ["Fire"],
        dexId: [4],
        illustrator: "Ken Sugimori",
      };

      const createdCard = { id: "card-1", ...dto, game: CardGame.Pokemon };
      const createdDetails = { hp: 100, types: ["Fire"], dexId: [4] };

      mockRepository.create.mockReturnValue(createdCard);
      mockDetailsRepository.create.mockReturnValue(createdDetails);
      mockRepository.save.mockResolvedValue({
        ...createdCard,
        pokemonDetails: createdDetails,
      });

      const result = await service.create(dto as any);
      expect(result.id).toBe("card-1");
      expect(result.hp).toBe(100);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should create card using setId when set object is not provided", async () => {
      const dto = {
        setId: "set-2",
        category: "Trainer",
      };

      const createdCard = { id: "card-2", game: CardGame.Pokemon };
      const createdDetails = { category: "Trainer" };

      mockRepository.create.mockReturnValue(createdCard);
      mockDetailsRepository.create.mockReturnValue(createdDetails);
      mockRepository.save.mockResolvedValue({
        ...createdCard,
        pokemonDetails: createdDetails,
      });

      const result = await service.create(dto as any);
      expect(result.id).toBe("card-2");
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          set: { id: "set-2" },
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should return a list of formatted pokemon cards", async () => {
      const card = {
        id: "c-1",
        pokemonDetails: { hp: 60, types: ["Water"] },
      } as Card;
      mockRepository.find.mockResolvedValue([card]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("c-1");
      expect(result[0].hp).toBe(60);
    });
  });

  describe("findOne", () => {
    it("should return a card when found", async () => {
      const card = {
        id: "c-1",
        pokemonDetails: { hp: 70 },
      } as Card;
      mockRepository.findOne.mockResolvedValue(card);

      const result = await service.findOne("c-1");
      expect(result.id).toBe("c-1");
      expect(result.hp).toBe(70);
    });

    it("should throw an error when card is not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne("non-existent")).rejects.toThrow(
        "Card with id non-existent not found",
      );
    });
  });

  describe("findBySearch", () => {
    it("should return empty array if search string is empty", async () => {
      const result = await service.findBySearch("");
      expect(result).toEqual([]);
    });

    it("should return matching cards when search is provided", async () => {
      const card = { id: "c-1", pokemonDetails: { hp: 50 } } as Card;
      mockQueryBuilder.getMany.mockResolvedValue([card]);

      const result = await service.findBySearch("Pikachu");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("c-1");
    });
  });

  describe("update", () => {
    it("should update and merge card details", async () => {
      const existingCard = {
        id: "c-1",
        game: CardGame.Pokemon,
        pokemonDetails: { hp: 60 },
      } as Card;
      mockRepository.findOne.mockResolvedValue(existingCard);
      mockRepository.merge.mockImplementation((target, src) =>
        Object.assign(target, src),
      );
      mockRepository.save.mockResolvedValue({
        ...existingCard,
        pokemonDetails: { hp: 90 },
      });

      const result = await service.update("c-1", {
        hp: 90,
        set: { id: "set-new" } as any,
      } as any);

      expect(result.hp).toBe(90);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should handle update with setId and create details if not existing", async () => {
      const existingCard = {
        id: "c-1",
        game: CardGame.Pokemon,
        pokemonDetails: null,
      } as unknown as Card;
      mockRepository.findOne.mockResolvedValue(existingCard);
      mockDetailsRepository.create.mockReturnValue({});
      mockRepository.merge.mockImplementation((target, src) =>
        Object.assign(target, src),
      );
      mockRepository.save.mockResolvedValue({
        ...existingCard,
        pokemonDetails: { hp: 80 },
      });

      const result = await service.update("c-1", {
        setId: "set-id-val",
        hp: 80,
      } as any);

      expect(mockDetailsRepository.create).toHaveBeenCalled();
      expect(result.hp).toBe(80);
    });
  });

  describe("remove", () => {
    it("should delete card by id", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });
      await service.remove("c-1");
      expect(mockRepository.delete).toHaveBeenCalledWith("c-1");
    });
  });

  describe("findAllPaginated", () => {
    it("should paginate cards with various filters", async () => {
      const card = { id: "c-1", pokemonDetails: {} } as Card;
      mockQueryBuilder.getMany.mockResolvedValue([card]);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.findAllPaginated(
        1,
        10,
        "Charizard",
        "set-1",
        "serie-1",
        "Rare",
        "Fire",
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
      expect(result.meta.currentPage).toBe(1);
    });
  });

  describe("findRandom", () => {
    it("should return random card with filters applied", async () => {
      const card = { id: "c-random", pokemonDetails: {} } as Card;
      mockQueryBuilder.getOne.mockResolvedValue(card);

      const result = await service.findRandom("serie-1", "Rare", "set-1");
      expect(result).toBeDefined();
      expect(result?.id).toBe("c-random");
    });

    it("should return null if no card matches random query", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      const result = await service.findRandom();
      expect(result).toBeNull();
    });
  });

  describe("findByScanMatch", () => {
    it("should return scored cards using strict AND matching", async () => {
      const card = {
        id: "c-1",
        name: "Pikachu",
        localId: "025",
        set: { name: "Base Set" },
        pokemonDetails: {},
      } as Card;
      mockQueryBuilder.getMany.mockResolvedValueOnce([card]);

      const result = await service.findByScanMatch({
        cardName: "Pikachu",
        localId: "025",
        setName: "Base Set",
      });

      expect(result).toHaveLength(1);
      expect(result[0].card.id).toBe("c-1");
      expect(result[0].score).toBeGreaterThan(100);
    });

    it("should fallback to OR matching when strict AND returns empty", async () => {
      const card = {
        id: "c-fallback",
        name: "Charmander",
        localId: "4",
        set: { name: "Base Set" },
        pokemonDetails: {},
      } as Card;

      // First query (AND) returns [], second query (OR) returns card
      mockQueryBuilder.getMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([card]);

      const result = await service.findByScanMatch({
        cardName: "Charmander",
        localId: "004",
        setName: "Base Set",
      });

      expect(result).toHaveLength(1);
      expect(result[0].card.id).toBe("c-fallback");
    });

    it("should return empty array if no scan parameters provided", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      const result = await service.findByScanMatch({});
      expect(result).toEqual([]);
    });
  });
});
