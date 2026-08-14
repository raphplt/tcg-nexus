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
});
