import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "../card/entities/card.entity";
import { CardState } from "../card-state/entities/card-state.entity";
import { Collection } from "../collection/entities/collection.entity";
import { User } from "../user/entities/user.entity";
import { CollectionItemController } from "./collection-item.controller";
import { CollectionItemService } from "./collection-item.service";
import { CollectionItem } from "./entities/collection-item.entity";

describe("CollectionItemController", () => {
  let controller: CollectionItemController;

  const currentUser = { id: 1 } as User;

  const mockCollectionItemService = {
    assertSelf: jest.fn(),
    addToWishlist: jest.fn(),
    addToFavorites: jest.fn(),
    addToCollection: jest.fn(),
    addSealedToCollection: jest.fn(),
    addSealedToWishlist: jest.fn(),
    updateItem: jest.fn(),
    splitItem: jest.fn(),
    mergeItem: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollectionItemController],
      providers: [
        {
          provide: CollectionItemService,
          useValue: mockCollectionItemService,
        },
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Collection),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Card),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(CardState),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<CollectionItemController>(CollectionItemController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should add to wishlist for the authenticated user", async () => {
    mockCollectionItemService.addToWishlist.mockResolvedValue({ id: 1 });

    await expect(
      controller.addToWishlist(1, currentUser, { pokemonCardId: "card" }),
    ).resolves.toEqual({ id: 1 });

    expect(mockCollectionItemService.assertSelf).toHaveBeenCalledWith(
      1,
      currentUser,
    );
    expect(mockCollectionItemService.addToWishlist).toHaveBeenCalledWith(
      currentUser.id,
      "card",
    );
  });

  it("should add to favorites for the authenticated user", async () => {
    mockCollectionItemService.addToFavorites.mockResolvedValue({ id: 2 });

    await expect(
      controller.addToFavorites(1, currentUser, { pokemonCardId: "card2" }),
    ).resolves.toEqual({ id: 2 });
  });

  it("should pass the authenticated user to the collection service", async () => {
    mockCollectionItemService.addToCollection.mockResolvedValue({ id: 3 });

    await expect(
      controller.addToCollection("col", currentUser, {
        pokemonCardId: "card3",
      }),
    ).resolves.toEqual({ id: 3 });

    expect(mockCollectionItemService.addToCollection).toHaveBeenCalledWith(
      "col",
      "card3",
      currentUser,
    );
  });

  it("should add sealed product to collection", async () => {
    mockCollectionItemService.addSealedToCollection.mockResolvedValue({
      id: 4,
    });

    const dto = { sealedProductId: "sealed-1", sealedCondition: "MINT" as any };
    await expect(
      controller.addSealedToCollection("col-1", currentUser, dto),
    ).resolves.toEqual({ id: 4 });

    expect(
      mockCollectionItemService.addSealedToCollection,
    ).toHaveBeenCalledWith("col-1", "sealed-1", currentUser, "MINT");
  });

  it("should add sealed product to wishlist", async () => {
    mockCollectionItemService.addSealedToWishlist.mockResolvedValue({ id: 5 });

    const dto = { sealedProductId: "sealed-2" };
    await expect(
      controller.addSealedToWishlist(1, currentUser, dto),
    ).resolves.toEqual({ id: 5 });

    expect(mockCollectionItemService.assertSelf).toHaveBeenCalledWith(
      1,
      currentUser,
    );
    expect(mockCollectionItemService.addSealedToWishlist).toHaveBeenCalledWith(
      1,
      "sealed-2",
    );
  });

  it("should update collection item", async () => {
    mockCollectionItemService.updateItem.mockResolvedValue({
      id: 10,
      notes: "updated",
    });

    const dto = { notes: "updated" };
    await expect(controller.updateItem(10, currentUser, dto)).resolves.toEqual({
      id: 10,
      notes: "updated",
    });

    expect(mockCollectionItemService.updateItem).toHaveBeenCalledWith(
      10,
      dto,
      currentUser,
    );
  });

  it("should split collection item", async () => {
    mockCollectionItemService.splitItem.mockResolvedValue({
      original: { id: 10 },
      split: { id: 11 },
    });

    await expect(controller.splitItem(10, currentUser, 2)).resolves.toEqual({
      original: { id: 10 },
      split: { id: 11 },
    });

    expect(mockCollectionItemService.splitItem).toHaveBeenCalledWith(
      10,
      2,
      currentUser,
    );
  });

  it("should merge collection items", async () => {
    mockCollectionItemService.mergeItem.mockResolvedValue({
      id: 20,
      quantity: 5,
    });

    await expect(controller.mergeItem(10, 20, currentUser)).resolves.toEqual({
      id: 20,
      quantity: 5,
    });

    expect(mockCollectionItemService.mergeItem).toHaveBeenCalledWith(
      10,
      20,
      currentUser,
    );
  });
});
