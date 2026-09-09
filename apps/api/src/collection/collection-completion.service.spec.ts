import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { ProductKind } from "src/common/enums/product-kind";
import { UserRole } from "src/common/enums/user";
import { User } from "src/user/entities/user.entity";
import { CollectionCompletionService } from "./collection-completion.service";
import { Collection } from "./entities/collection.entity";

describe("CollectionCompletionService", () => {
  let service: CollectionCompletionService;
  let collectionRepo: any;
  let itemRepo: any;
  let cardRepo: any;

  const mockUser: User = {
    id: 1,
    role: UserRole.USER,
  } as User;

  const mockSet = {
    id: "sv01",
    name: "Scarlet & Violet",
  };

  const card1: Card = {
    id: "c1",
    localId: "001",
    set: mockSet as any,
    variants: { normal: true, reverse: true },
    translations: [{ rarity: "Common" } as any],
  } as Card;

  const card2: Card = {
    id: "c2",
    localId: "002",
    set: mockSet as any,
    variants: { normal: true },
    translations: [{ rarity: "Rare" } as any],
  } as Card;

  beforeEach(async () => {
    collectionRepo = {
      findOne: jest.fn(),
    };
    itemRepo = {
      find: jest.fn(),
    };
    cardRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionCompletionService,
        {
          provide: getRepositoryToken(Collection),
          useValue: collectionRepo,
        },
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: itemRepo,
        },
        {
          provide: getRepositoryToken(Card),
          useValue: cardRepo,
        },
      ],
    }).compile();

    service = module.get<CollectionCompletionService>(
      CollectionCompletionService,
    );
  });

  it("throws NotFoundException if collection does not exist", async () => {
    collectionRepo.findOne.mockResolvedValue(null);
    await expect(
      service.calculateCompletion("missing", undefined, mockUser),
    ).rejects.toThrow(NotFoundException);
  });

  it("calculates Base Set completion accurately (1 unique target per distinct card)", async () => {
    collectionRepo.findOne.mockResolvedValue({
      id: "col-1",
      user: mockUser,
      masterSet: mockSet,
      completionPolicy: "base",
    });

    cardRepo.find.mockResolvedValue([card1, card2]);

    // User owns 1 copy of card1, 0 of card2
    itemRepo.find.mockResolvedValue([
      {
        id: 10,
        productKind: ProductKind.CARD,
        pokemonCard: card1,
        variant: "normal",
        quantity: 1,
      },
    ]);

    const res = await service.calculateCompletion("col-1", "base", mockUser);

    expect(res.totalUniqueTargets).toBe(2);
    expect(res.ownedUniqueTargets).toBe(1);
    expect(res.percentage).toBe(50);
    expect(res.totalCopiesCount).toBe(1);
    expect(res.duplicateCopiesCount).toBe(0);
    expect(res.missingCount).toBe(1);
    expect(res.isComplete).toBe(false);
  });

  it("guarantees adding duplicate copies does NOT increase completion percentage (COL-03 acceptance)", async () => {
    collectionRepo.findOne.mockResolvedValue({
      id: "col-1",
      user: mockUser,
      masterSet: mockSet,
      completionPolicy: "base",
    });

    cardRepo.find.mockResolvedValue([card1, card2]);

    // User owns 5 copies of card1, 0 of card2
    itemRepo.find.mockResolvedValue([
      {
        id: 10,
        productKind: ProductKind.CARD,
        pokemonCard: card1,
        variant: "normal",
        quantity: 5,
      },
    ]);

    const res = await service.calculateCompletion("col-1", "base", mockUser);

    expect(res.totalUniqueTargets).toBe(2);
    expect(res.ownedUniqueTargets).toBe(1);
    expect(res.percentage).toBe(50); // Still 50%, not increased!
    expect(res.totalCopiesCount).toBe(5);
    expect(res.duplicateCopiesCount).toBe(4);
    expect(res.missingCount).toBe(1);
    expect(res.isComplete).toBe(false);
  });

  it("calculates Master Set completion differentiating card variants (COL-03)", async () => {
    collectionRepo.findOne.mockResolvedValue({
      id: "col-1",
      user: mockUser,
      masterSet: mockSet,
      completionPolicy: "master",
    });

    // card1 has normal + reverse (2 targets), card2 has normal (1 target) = 3 total targets
    cardRepo.find.mockResolvedValue([card1, card2]);

    // User owns card1 normal and card1 reverse
    itemRepo.find.mockResolvedValue([
      {
        id: 10,
        productKind: ProductKind.CARD,
        pokemonCard: card1,
        variant: "normal",
        quantity: 1,
      },
      {
        id: 11,
        productKind: ProductKind.CARD,
        pokemonCard: card1,
        variant: "reverse",
        quantity: 1,
      },
    ]);

    const res = await service.calculateCompletion("col-1", "master", mockUser);

    expect(res.totalUniqueTargets).toBe(3);
    expect(res.ownedUniqueTargets).toBe(2);
    expect(res.percentage).toBe(66.67);
    expect(res.totalCopiesCount).toBe(2);
    expect(res.duplicateCopiesCount).toBe(0);
    expect(res.missingCount).toBe(1);
    expect(res.isComplete).toBe(false);
  });
});
