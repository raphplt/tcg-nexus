import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { CardState } from "src/card-state/entities/card-state.entity";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { Currency } from "src/common/enums/currency";
import { ProductKind } from "src/common/enums/product-kind";
import { UserRole } from "src/common/enums/user";
import { User } from "src/user/entities/user.entity";
import { CollectionValuationService } from "./collection-valuation.service";
import { Collection } from "./entities/collection.entity";

describe("CollectionValuationService", () => {
  let service: CollectionValuationService;
  let collectionRepo: any;
  let itemRepo: any;

  const mockUser: User = {
    id: 1,
    role: UserRole.USER,
  } as User;

  const cardWithPrice: Card = {
    id: "c-priced",
    pricing: {
      cardmarket: {
        trend: 10.0,
      } as any,
    },
  } as unknown as Card;


  const cardWithoutPrice: Card = {
    id: "c-unpriced",
    pricing: null,
  } as unknown as Card;


  beforeEach(async () => {
    collectionRepo = {
      findOne: jest.fn(),
    };
    itemRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionValuationService,
        {
          provide: getRepositoryToken(Collection),
          useValue: collectionRepo,
        },
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: itemRepo,
        },
      ],
    }).compile();

    service = module.get<CollectionValuationService>(
      CollectionValuationService,
    );
  });

  it("calculates valuation transparently distinguishing valued from unvalued items (COL-06)", async () => {
    collectionRepo.findOne.mockResolvedValue({
      id: "col-1",
      user: mockUser,
    });

    itemRepo.find.mockResolvedValue([
      {
        id: 1,
        productKind: ProductKind.CARD,
        pokemonCard: cardWithPrice,
        cardState: { code: "NM" },
        quantity: 2, // 2 copies * 10.0 EUR = 20.0 EUR
        acquisitionCost: 7.0, // 2 * 7.0 = 14.0 EUR total cost
      },
      {
        id: 2,
        productKind: ProductKind.CARD,
        pokemonCard: cardWithoutPrice,
        cardState: { code: "EX" },
        quantity: 1, // 1 unpriced copy
        acquisitionCost: null,
      },
    ]);

    const res = await service.calculateValuation("col-1", Currency.EUR, mockUser);

    expect(res.totalCopiesCount).toBe(3);
    expect(res.valuedCopiesCount).toBe(2);
    expect(res.unvaluedCopiesCount).toBe(1);
    expect(res.coveragePercentage).toBe(66.67);
    expect(res.totalEstimatedValue).toBe(20.0);
    expect(res.totalAcquisitionCost).toBe(14.0);
    expect(res.unrealizedGainLoss).toBe(6.0);
    expect(res.roiPercentage).toBe(42.86);
    expect(res.sources).toContain("Cardmarket (trend/avg)");
  });

  it("applies condition multiplier correctly (NM = 1.0, EX = 0.9)", async () => {
    collectionRepo.findOne.mockResolvedValue({
      id: "col-1",
      user: mockUser,
    });

    itemRepo.find.mockResolvedValue([
      {
        id: 1,
        productKind: ProductKind.CARD,
        pokemonCard: cardWithPrice,
        cardState: { code: "EX" },
        quantity: 1, // 1 copy * (10.0 * 0.9) = 9.0 EUR
      },
    ]);

    const res = await service.calculateValuation("col-1", Currency.EUR, mockUser);

    expect(res.totalEstimatedValue).toBe(9.0);
    expect(res.valuedCopiesCount).toBe(1);
    expect(res.coveragePercentage).toBe(100);
  });
});
