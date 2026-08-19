import { CardService } from "../card/card.service";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "../card/entities/card.entity";
import { CardState } from "../card-state/entities/card-state.entity";
import { CollectionItem } from "../collection-item/entities/collection-item.entity";
import { PokemonSet } from "../pokemon-set/entities/pokemon-set.entity";
import { CollectionService } from "./collection.service";
import { Collection } from "./entities/collection.entity";

describe("CollectionService", () => {
  let service: CollectionService;

  const mockCollectionRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockCollectionItemRepo = {
    createQueryBuilder: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve(entity)),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    findOne: jest.fn(),
  };

  const mockCardRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCardStateRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockPokemonSetRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const createQueryBuilder = () => {
    const qb: any = {
      leftJoin: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(2),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    };
    return qb;
  };

  beforeEach(async () => {
    mockCollectionItemRepo.createQueryBuilder.mockImplementation(
      createQueryBuilder,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionService,
        {
          provide: getRepositoryToken(Collection),
          useValue: mockCollectionRepo,
        },
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: mockCollectionItemRepo,
        },
        {
          provide: getRepositoryToken(Card),
          useValue: mockCardRepo,
        },
        {
          provide: getRepositoryToken(CardState),
          useValue: mockCardStateRepo,
        },
        {
          provide: getRepositoryToken(PokemonSet),
          useValue: mockPokemonSetRepo,
        },
        {
          provide: CardService,
          useValue: { getSetRarities: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get<CollectionService>(CollectionService);
    jest.clearAllMocks();
  });

  it("should list public collections", async () => {
    mockCollectionRepo.find.mockResolvedValue([{ id: "1" }]);
    const result = await service.findAll();
    expect(result).toEqual([{ id: "1" }]);
    expect(mockCollectionRepo.find).toHaveBeenCalled();
  });

  it("should find collections by user id", async () => {
    mockCollectionRepo.find.mockResolvedValue([{ id: "1", user: { id: 2 } }]);
    const result = await service.findByUserId("2");
    expect(result[0].user.id).toBe(2);
  });

  it("should find one collection or throw", async () => {
    const publicCollection = { id: "10", isPublic: true };
    mockCollectionRepo.findOne.mockResolvedValue(publicCollection);
    await expect(service.findOneById("10")).resolves.toEqual(publicCollection);

    mockCollectionRepo.findOne.mockResolvedValue(null);
    await expect(service.findOneById("missing")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should create collection with user relation", async () => {
    const dto = { name: "Col", description: "desc", userId: 3 };
    mockCollectionRepo.create.mockReturnValue({ ...dto });
    mockCollectionRepo.save.mockResolvedValue({ id: "new", ...dto });

    const result = await service.create(dto as any);
    expect(result.id).toBe("new");
    expect(mockCollectionRepo.save).toHaveBeenCalled();
  });

  it("should update collection when owner matches", async () => {
    mockCollectionRepo.findOne.mockResolvedValue({
      id: "c",
      user: { id: 1 },
      name: "Old",
    });
    mockCollectionRepo.save.mockResolvedValue({
      id: "c",
      name: "New",
      user: { id: 1 },
    });

    const result = await service.update("c", { name: "New" } as any, 1);
    expect(result.name).toBe("New");
  });

  it("should forbid update when user mismatches", async () => {
    mockCollectionRepo.findOne.mockResolvedValue({
      id: "c",
      user: { id: 2 },
    });
    await expect(service.update("c", {} as any, 1)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should throw on update when collection missing", async () => {
    mockCollectionRepo.findOne.mockResolvedValue(null);
    await expect(service.update("missing", {} as any, 1)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should delete when owner matches", async () => {
    const mockColl = {
      id: "c",
      user: { id: 1 },
    };
    mockCollectionRepo.findOne.mockResolvedValue(mockColl);
    mockCollectionRepo.remove.mockResolvedValue(mockColl);
    await expect(service.delete("c", 1)).resolves.toBeUndefined();
    expect(mockCollectionRepo.remove).toHaveBeenCalledWith(mockColl);
  });

  it("should forbid delete for other user", async () => {
    mockCollectionRepo.findOne.mockResolvedValue({
      id: "c",
      user: { id: 2 },
    });
    await expect(service.delete("c", 1)).rejects.toThrow(ForbiddenException);
  });

  it("should throw on delete when missing", async () => {
    mockCollectionRepo.findOne.mockResolvedValue(null);
    await expect(service.delete("missing", 1)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should paginate collections", async () => {
    mockCollectionRepo.findAndCount.mockResolvedValue([[{ id: "a" }], 3]);
    const result = await service.findAllPaginated(1, 2);
    expect(result.totalPages).toBe(2);
    expect(result.collections).toHaveLength(1);
  });

  it("should paginate collection items with search", async () => {
    mockCollectionRepo.findOne.mockResolvedValue({ id: "c", isPublic: true });
    const qb = createQueryBuilder();
    mockCollectionItemRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.findCollectionItemsPaginated(
      "c",
      1,
      2,
      "pikachu",
      "invalid",
      "ASC",
    );

    expect(qb.andWhere).toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith("item.added_at", "ASC");
    expect(result.meta.totalItems).toBe(2);
  });

  it("should order by pokemonCard name when requested", async () => {
    mockCollectionRepo.findOne.mockResolvedValue({ id: "c", isPublic: true });
    const qb = createQueryBuilder();
    mockCollectionItemRepo.createQueryBuilder.mockReturnValue(qb);

    await service.findCollectionItemsPaginated(
      "c",
      1,
      2,
      undefined,
      "pokemonCard.name",
      "DESC",
    );
    // Names live in card_translation: sorting joins it on the default locale.
    expect(qb.orderBy).toHaveBeenCalledWith("sortTranslation.name", "DESC");
  });

  it("should throw when collection missing on pagination", async () => {
    mockCollectionRepo.findOne.mockResolvedValue(null);
    await expect(
      service.findCollectionItemsPaginated("missing", 1, 10),
    ).rejects.toThrow(NotFoundException);
  });

  describe("addCardToCollection & removeCardFromCollection & removeCollectionItem", () => {
    it("should increment quantity if card already in collection", async () => {
      const existingItem = { id: 10, quantity: 1, pokemonCard: { id: "card-1" } };
      mockCollectionRepo.findOne.mockResolvedValue({
        id: "c1",
        user: { id: 1 },
        items: [existingItem],
      });
      mockCardRepo.findOne.mockResolvedValue({ id: "card-1" });
      mockCollectionItemRepo.save = jest.fn((item) => Promise.resolve(item));

      const result = await service.addCardToCollection("c1", "card-1", 1);
      expect(result.quantity).toBe(2);
    });

    it("should add new card item with default NM state if not in collection", async () => {
      mockCollectionRepo.findOne.mockResolvedValue({
        id: "c1",
        user: { id: 1 },
        items: [],
      });
      mockCardRepo.findOne.mockResolvedValue({ id: "card-2" });
      mockCardStateRepo.findOne.mockResolvedValue({ id: 1, code: "NM" });
      mockCollectionItemRepo.create = jest.fn((dto) => dto);
      mockCollectionItemRepo.save = jest.fn((item) => Promise.resolve({ id: 20, ...item }));

      const result = await service.addCardToCollection("c1", "card-2", 1);
      expect((result as any)?.pokemonCard?.id).toBe("card-2");
      expect(result.quantity).toBe(1);
    });

    it("should decrement quantity if quantity > 1 on removeCardFromCollection", async () => {
      const existingItem = { id: 10, quantity: 2, pokemonCard: { id: "card-1" } };
      mockCollectionRepo.findOne.mockResolvedValue({
        id: "c1",
        user: { id: 1 },
        items: [existingItem],
      });
      mockCollectionItemRepo.save = jest.fn((item) => Promise.resolve(item));

      const result = await service.removeCardFromCollection("c1", "card-1", 1);
      expect(result?.quantity).toBe(1);
    });

    it("should delete item if quantity == 1 on removeCardFromCollection", async () => {
      const existingItem = { id: 10, quantity: 1, pokemonCard: { id: "card-1" } };
      mockCollectionRepo.findOne.mockResolvedValue({
        id: "c1",
        user: { id: 1 },
        items: [existingItem],
      });
      mockCollectionItemRepo.delete = jest.fn().mockResolvedValue({ affected: 1 });

      const result = await service.removeCardFromCollection("c1", "card-1", 1);
      expect(result).toBeNull();
      expect(mockCollectionItemRepo.delete).toHaveBeenCalledWith(10);
    });

    it("should remove collection item by id", async () => {
      mockCollectionRepo.findOne.mockResolvedValue({
        id: "c1",
        user: { id: 1 },
      });
      mockCollectionItemRepo.findOne.mockResolvedValue({ id: 5 });
      mockCollectionItemRepo.delete = jest.fn().mockResolvedValue({ affected: 1 });

      await service.removeCollectionItem("c1", 5, 1);
      expect(mockCollectionItemRepo.delete).toHaveBeenCalledWith(5);
    });
  });

  describe("master set collection pagination & getSetRarities", () => {
    it("should paginate master set items using cardRepository", async () => {
      mockCollectionRepo.findOne.mockResolvedValue({
        id: "c-master",
        isPublic: true,
        masterSet: { id: "set-1" },
      });

      const cardQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: "c1", tcgDexId: "p1", collectionItems: [{ id: 1, quantity: 1 }] },
        ]),
      };
      mockCardRepo.createQueryBuilder = jest.fn(() => cardQb);

      const result = await service.findCollectionItemsPaginated(
        "c-master",
        1,
        10,
        "Pikachu",
        "added_at",
        "DESC",
        "set-1",
        "serie-1",
        "Rare",
        "NM",
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });

    it("should delegate getSetRarities to CardService for master sets", async () => {
      mockCollectionRepo.findOne.mockResolvedValue({
        id: "c-master",
        isPublic: true,
        masterSet: { id: "set-1" },
      });

      const result = await service.getSetRarities("c-master", "fr");
      expect(result).toBeDefined();
    });
  });
});
