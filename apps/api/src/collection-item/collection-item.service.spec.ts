import { ForbiddenException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import { Card } from "../card/entities/card.entity";
import { CardState } from "../card-state/entities/card-state.entity";
import { Collection } from "../collection/entities/collection.entity";
import { User } from "../user/entities/user.entity";
import { CollectionItemService } from "./collection-item.service";
import { CollectionItem } from "./entities/collection-item.entity";

describe("CollectionItemService", () => {
  let service: CollectionItemService;

  const owner = { id: 1 } as User;
  const attacker = { id: 2 } as User;

  const mockCollectionItemRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    increment: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCollectionRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPokemonCardRepo = {
    findOne: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockCardStateRepo = {
    findOne: jest.fn(),
  };

  const mockSealedProductRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionItemService,
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: mockCollectionItemRepo,
        },
        {
          provide: getRepositoryToken(Collection),
          useValue: mockCollectionRepo,
        },
        {
          provide: getRepositoryToken(Card),
          useValue: mockPokemonCardRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(CardState),
          useValue: mockCardStateRepo,
        },
        {
          provide: getRepositoryToken(SealedProduct),
          useValue: mockSealedProductRepo,
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn(), emitAsync: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CollectionItemService>(CollectionItemService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("assertSelf", () => {
    it("allows a user to act on their own collections", () => {
      expect(() => service.assertSelf(owner.id, owner)).not.toThrow();
    });

    it("rejects a user targeting someone else", () => {
      expect(() => service.assertSelf(owner.id, attacker)).toThrow(
        ForbiddenException,
      );
    });
  });

  it("should add card to wishlist with default card state", async () => {
    mockUserRepo.findOne.mockResolvedValue(owner);
    mockPokemonCardRepo.findOne.mockResolvedValue({ id: "card1" });
    mockCollectionRepo.findOne.mockResolvedValue({ id: "w" });
    mockCollectionItemRepo.findOne.mockResolvedValue(null);
    mockCardStateRepo.findOne.mockResolvedValue({ id: 10, code: "NM" });
    mockCollectionItemRepo.create.mockReturnValue({ id: 5 });
    mockCollectionItemRepo.save.mockResolvedValue({ id: 5 });

    await expect(service.addToWishlist(1, "card1")).resolves.toEqual({ id: 5 });
  });

  it("should create wishlist when missing", async () => {
    mockUserRepo.findOne.mockResolvedValue(owner);
    mockPokemonCardRepo.findOne.mockResolvedValue({ id: "card1" });
    mockCollectionRepo.findOne.mockResolvedValue(null);
    mockCollectionRepo.create.mockReturnValue({ id: "nw" });
    mockCollectionRepo.save.mockResolvedValue({ id: "nw" });
    mockCollectionItemRepo.findOne.mockResolvedValue(null);
    mockCardStateRepo.findOne.mockResolvedValue({ id: 10, code: "NM" });
    mockCollectionItemRepo.create.mockReturnValue({ id: 6 });
    mockCollectionItemRepo.save.mockResolvedValue({ id: 6 });

    await expect(service.addToWishlist(1, "card1")).resolves.toEqual({ id: 6 });
  });

  it("should increment quantity atomically when item already in wishlist", async () => {
    mockUserRepo.findOne.mockResolvedValue(owner);
    mockPokemonCardRepo.findOne.mockResolvedValue({ id: "card1" });
    mockCollectionRepo.findOne.mockResolvedValue({ id: "w" });
    mockCollectionItemRepo.findOne.mockResolvedValue({ id: 2, quantity: 1 });
    mockCollectionItemRepo.increment.mockResolvedValue({ affected: 1 });
    mockCollectionItemRepo.findOneOrFail.mockResolvedValue({
      id: 2,
      quantity: 2,
    });

    const result = await service.addToWishlist(1, "card1");

    expect(mockCollectionItemRepo.increment).toHaveBeenCalledWith(
      { id: 2 },
      "quantity",
      1,
    );
    expect(result.quantity).toBe(2);
  });

  it("should throw when user not found", async () => {
    mockUserRepo.findOne.mockResolvedValue(null);
    await expect(service.addToWishlist(1, "card1")).rejects.toThrow(
      "Utilisateur non trouvé",
    );
  });

  it("should throw when default card state missing for wishlist", async () => {
    mockUserRepo.findOne.mockResolvedValue(owner);
    mockPokemonCardRepo.findOne.mockResolvedValue({ id: "card1" });
    mockCollectionRepo.findOne.mockResolvedValue({ id: "w" });
    mockCollectionItemRepo.findOne.mockResolvedValue(null);
    mockCardStateRepo.findOne.mockResolvedValue(null);

    await expect(service.addToWishlist(1, "card1")).rejects.toThrow(
      "CardState NM non trouvé. Veuillez d'abord seed les CardState.",
    );
  });

  it("should throw when card not found", async () => {
    mockUserRepo.findOne.mockResolvedValue(owner);
    mockPokemonCardRepo.findOne.mockResolvedValue(null);

    await expect(service.addToWishlist(1, "missing")).rejects.toThrow(
      "Carte Pokémon non trouvée",
    );
  });

  it("should add to favorites", async () => {
    mockUserRepo.findOne.mockResolvedValue(owner);
    mockPokemonCardRepo.findOne.mockResolvedValue({ id: "card1" });
    mockCollectionRepo.findOne.mockResolvedValue({ id: "f" });
    mockCollectionItemRepo.findOne.mockResolvedValue(null);
    mockCardStateRepo.findOne.mockResolvedValue({ id: 3, code: "NM" });
    mockCollectionItemRepo.create.mockReturnValue({ id: 8 });
    mockCollectionItemRepo.save.mockResolvedValue({ id: 8 });

    await expect(service.addToFavorites(1, "card1")).resolves.toEqual({
      id: 8,
    });
  });

  it("should throw when favorites collection missing", async () => {
    mockUserRepo.findOne.mockResolvedValue(owner);
    mockPokemonCardRepo.findOne.mockResolvedValue({ id: "c" });
    mockCollectionRepo.findOne.mockResolvedValue(null);

    await expect(service.addToFavorites(1, "c")).rejects.toThrow(
      "Collection Favorites non trouvée. Vérifiez que les collections par défaut sont créées.",
    );
  });

  describe("addToCollection", () => {
    it("adds a card to a collection owned by the caller", async () => {
      mockCollectionRepo.findOne.mockResolvedValue({ id: "c", user: owner });
      mockPokemonCardRepo.findOne.mockResolvedValue({ id: "card1" });
      mockCollectionItemRepo.findOne.mockResolvedValue(null);
      mockCardStateRepo.findOne.mockResolvedValue({ id: 4, code: "NM" });
      mockCollectionItemRepo.create.mockReturnValue({ id: 9 });
      mockCollectionItemRepo.save.mockResolvedValue({ id: 9 });

      await expect(
        service.addToCollection("c", "card1", owner),
      ).resolves.toEqual({ id: 9 });
    });

    it("rejects writing into a collection owned by someone else", async () => {
      mockCollectionRepo.findOne.mockResolvedValue({ id: "c", user: owner });

      await expect(
        service.addToCollection("c", "card1", attacker),
      ).rejects.toThrow(ForbiddenException);
      expect(mockCollectionItemRepo.save).not.toHaveBeenCalled();
    });

    it("throws when the collection is missing", async () => {
      mockCollectionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addToCollection("missing", "card1", owner),
      ).rejects.toThrow("Collection non trouvée");
    });

    it("throws when the card is missing", async () => {
      mockCollectionRepo.findOne.mockResolvedValue({ id: "c", user: owner });
      mockPokemonCardRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addToCollection("c", "missing", owner),
      ).rejects.toThrow("Carte Pokémon non trouvée");
    });
  });

  describe("addSealedToCollection & addSealedToWishlist", () => {
    it("rejects writing into a collection owned by someone else", async () => {
      mockCollectionRepo.findOne.mockResolvedValue({ id: "c", user: owner });

      await expect(
        service.addSealedToCollection("c", "sealed1", attacker),
      ).rejects.toThrow(ForbiddenException);
      expect(mockCollectionItemRepo.save).not.toHaveBeenCalled();
    });

    it("adds a sealed product to a collection owned by the caller", async () => {
      mockCollectionRepo.findOne.mockResolvedValue({ id: "c", user: owner });
      mockSealedProductRepo.findOne.mockResolvedValue({ id: "sealed1" });
      mockCollectionItemRepo.findOne.mockResolvedValue(null);
      mockCollectionItemRepo.create.mockReturnValue({ id: 20 });
      mockCollectionItemRepo.save.mockResolvedValue({ id: 20 });

      const item = await service.addSealedToCollection("c", "sealed1", owner);
      expect(item).toEqual({ id: 20 });
    });

    it("increments quantity when sealed item already exists in collection", async () => {
      mockCollectionRepo.findOne.mockResolvedValue({ id: "c", user: owner });
      mockSealedProductRepo.findOne.mockResolvedValue({ id: "sealed1" });
      mockCollectionItemRepo.findOne.mockResolvedValue({ id: 20, quantity: 1 });
      mockCollectionItemRepo.increment.mockResolvedValue({ affected: 1 });
      mockCollectionItemRepo.findOneOrFail.mockResolvedValue({ id: 20, quantity: 2 });

      const item = await service.addSealedToCollection("c", "sealed1", owner);
      expect(item.quantity).toBe(2);
    });

    it("adds a sealed product to user wishlist", async () => {
      mockSealedProductRepo.findOne.mockResolvedValue({ id: "sealed1" });
      mockCollectionRepo.findOne.mockResolvedValue({ id: "w", user: owner });
      mockCollectionItemRepo.findOne.mockResolvedValue(null);
      mockCollectionItemRepo.create.mockReturnValue({ id: 21 });
      mockCollectionItemRepo.save.mockResolvedValue({ id: 21 });

      const item = await service.addSealedToWishlist(1, "sealed1");
      expect(item).toEqual({ id: 21 });
    });

    it("throws when wishlist not found for addSealedToWishlist", async () => {
      mockSealedProductRepo.findOne.mockResolvedValue({ id: "sealed1" });
      mockCollectionRepo.findOne.mockResolvedValue(null);

      await expect(service.addSealedToWishlist(1, "sealed1")).rejects.toThrow(
        "Collection Wishlist non trouvée",
      );
    });
  });
});
