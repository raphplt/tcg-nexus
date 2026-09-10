import { ServiceUnavailableException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CatalogLocalizationService } from "../card/catalog-localization.service";
import { Card } from "../card/entities/card.entity";
import { PokemonCardDetails } from "../card/entities/pokemon-card-details.entity";
import { Listing } from "../marketplace/entities/listing.entity";
import { SealedProduct } from "../sealed-product/entities/sealed-product.entity";
import { PokemonSet } from "../pokemon-set/entities/pokemon-set.entity";
import { MiniGameItemsService, shuffle } from "./mini-game-items.service";

function makeCard(id: string, trend: number | null): Card {
  const card = new Card();
  card.id = id;
  card.pricing = { cardmarket: { trend } as never };
  const set = new PokemonSet();
  set.id = "set-1";
  card.set = set;
  const details = new PokemonCardDetails();
  details.category = "Pokemon" as never;
  card.pokemonDetails = details;
  return card;
}

function makeSealed(id: string): SealedProduct {
  const product = new SealedProduct();
  product.id = id;
  product.productType = "etb" as never;
  return product;
}

describe("MiniGameItemsService", () => {
  let service: MiniGameItemsService;

  const cardQb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const listingQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };
  const sealedRepo = { find: jest.fn() };
  const localization = {
    localize: jest.fn(async (payload: unknown) => payload),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MiniGameItemsService,
        {
          provide: getRepositoryToken(Card),
          useValue: { createQueryBuilder: () => cardQb },
        },
        { provide: getRepositoryToken(SealedProduct), useValue: sealedRepo },
        {
          provide: getRepositoryToken(Listing),
          useValue: { createQueryBuilder: () => listingQb },
        },
        { provide: CatalogLocalizationService, useValue: localization },
      ],
    }).compile();
    service = module.get(MiniGameItemsService);
  });

  describe("drawPricedCards", () => {
    it("restricts the draw to Pokémon cards and drops unusable prices", async () => {
      cardQb.getMany.mockResolvedValue([
        makeCard("a", 3),
        makeCard("b", 0),
        makeCard("c", 8),
        makeCard("d", 1),
      ]);

      const cards = await service.drawPricedCards(2);

      expect(cards.map((c) => c.id)).toEqual(["a", "c"]);
      expect(cardQb.where).toHaveBeenCalledWith("card.game = :game", {
        game: "POKEMON",
      });
      expect(cardQb.limit).toHaveBeenCalledWith(4);
    });

    it("drops cards under the requested price floor", async () => {
      cardQb.getMany.mockResolvedValue([
        makeCard("cheap", 0.04),
        makeCard("ok", 1.5),
        makeCard("energy", 0.15),
        makeCard("rare", 12),
      ]);

      const cards = await service.drawPricedCards(2, undefined, { minPrice: 1 });

      expect(cards.map((c) => c.id)).toEqual(["ok", "rare"]);
      expect(cardQb.limit).toHaveBeenCalledWith(8);
    });

    it("applies the set filter when given", async () => {
      cardQb.getMany.mockResolvedValue([]);
      await service.drawPricedCards(1, "sv01");
      expect(cardQb.andWhere).toHaveBeenCalledWith("set.id = :setId", {
        setId: "sv01",
      });
    });
  });

  describe("drawPricedSealedProducts", () => {
    it("prices products by the average of their active listings", async () => {
      listingQb.getRawMany.mockResolvedValue([
        { id: "etb-1", avgPrice: "54.999" },
        { id: "etb-2", avgPrice: "0" },
      ]);
      sealedRepo.find.mockResolvedValue([makeSealed("etb-1")]);

      const result = await service.drawPricedSealedProducts(2);

      expect(result).toHaveLength(1);
      expect(result[0]!.price).toBe(55);
      expect(result[0]!.product.id).toBe("etb-1");
    });

    it("returns nothing when no product has a listing", async () => {
      listingQb.getRawMany.mockResolvedValue([]);
      expect(await service.drawPricedSealedProducts(2)).toEqual([]);
      expect(sealedRepo.find).not.toHaveBeenCalled();
    });
  });

  describe("buildJustePrixItems", () => {
    it("mixes cards and sealed products and fills missing sealed with cards", async () => {
      listingQb.getRawMany.mockResolvedValue([{ id: "etb-1", avgPrice: "40" }]);
      sealedRepo.find.mockResolvedValue([makeSealed("etb-1")]);
      cardQb.getMany.mockResolvedValue([
        makeCard("a", 1),
        makeCard("b", 2),
        makeCard("c", 3),
        makeCard("d", 4),
      ]);

      const items = await service.buildJustePrixItems(5);

      expect(items).toHaveLength(5);
      expect(items.filter((i) => i.type === "sealed")).toHaveLength(1);
      expect(items.filter((i) => i.type === "card")).toHaveLength(4);
      expect(items.every((i) => i.price > 0)).toBe(true);
    });

    it("refuses to start with mock data when the catalog runs short", async () => {
      listingQb.getRawMany.mockResolvedValue([]);
      cardQb.getMany.mockResolvedValue([makeCard("a", 1)]);

      await expect(service.buildJustePrixItems(5)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe("buildCaseOpeningPacks", () => {
    it("builds one pack of six per player per round", async () => {
      cardQb.getMany.mockResolvedValue(
        Array.from({ length: 24 }, (_, i) => makeCard(`c${i}`, 1)),
      );

      const packs = await service.buildCaseOpeningPacks(2, 2);

      expect(packs).toHaveLength(2);
      expect(packs[0]).toHaveLength(2);
      expect(packs[1]![1]).toHaveLength(6);
      expect(packs[0]![0]![0]!.id).toBe("c0");
      expect(packs[1]![1]![5]!.id).toBe("c23");
    });

    it("reuses a short pool rather than refusing the duel", async () => {
      cardQb.getMany.mockResolvedValue([makeCard("only", 1)]);
      const packs = await service.buildCaseOpeningPacks(1, 2);
      expect(packs[0]![1]!.every((c) => c.id === "only")).toBe(true);
    });

    it("fails when no priced card exists at all", async () => {
      cardQb.getMany.mockResolvedValue([]);
      await expect(service.buildCaseOpeningPacks(1, 2)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe("localizeCards", () => {
    it("localizes a copy and strips the pricing by default", async () => {
      const card = makeCard("a", 12);
      localization.localize.mockImplementation(async (payload: unknown) => {
        if (Array.isArray(payload)) {
          for (const c of payload as Card[]) c.name = "Pikachu";
        }
        return payload;
      });

      const [copy] = await service.localizeCards([card], "en");

      expect(copy!.name).toBe("Pikachu");
      expect(copy!.pricing).toBeUndefined();
      expect(copy).toBeInstanceOf(Card);
      expect(copy!.set).toBeInstanceOf(PokemonSet);
      expect(card.name).toBeUndefined();
      expect(card.pricing).toBeDefined();
      expect(localization.localize).toHaveBeenCalledWith(expect.any(Array), "en");
    });

    it("keeps the pricing of revealed cards on request", async () => {
      const [copy] = await service.localizeCards([makeCard("a", 12)], "fr", {
        keepPricing: true,
      });
      expect(copy!.pricing).toBeDefined();
    });
  });

  describe("localizeJustePrixItem", () => {
    it("never exposes the price", async () => {
      const item = await service.localizeJustePrixItem(
        { type: "card", id: "a", price: 12, data: makeCard("a", 12) },
        "fr",
      );
      expect(item).not.toHaveProperty("price");
      expect((item.data as Card).pricing).toBeUndefined();

      const sealed = await service.localizeJustePrixItem(
        { type: "sealed", id: "etb-1", price: 40, data: makeSealed("etb-1") },
        "fr",
      );
      expect(sealed).not.toHaveProperty("price");
      expect(sealed.data).toBeInstanceOf(SealedProduct);
    });
  });

  it("shuffle keeps every element exactly once", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const output = shuffle(input);
    expect(output).toHaveLength(6);
    expect([...output].sort()).toEqual([...input].sort());
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
