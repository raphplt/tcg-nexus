import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CatalogLocalizationService } from "src/card/catalog-localization.service";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { DeckCard } from "src/deck-card/entities/deck-card.entity";
import { Listing } from "src/marketplace/entities/listing.entity";
import { User } from "src/user/entities/user.entity";
import { DeckInventoryService } from "./deck-inventory.service";
import { Deck } from "./entities/deck.entity";

describe("DeckInventoryService", () => {
  let service: DeckInventoryService;
  let deckRepo: any;
  let itemRepo: any;
  let listingRepo: any;
  let localization: any;

  const mockUser: User = {
    id: 1,
    firstName: "Ash",
    lastName: "Ketchum",
  } as User;

  const card1 = {
    id: "card-pikachu",
    name: "Pikachu",
    tcgDexId: "base1-58",
  };

  beforeEach(async () => {
    deckRepo = {
      findOne: jest.fn(),
    };
    itemRepo = {
      find: jest.fn(),
    };
    listingRepo = {
      find: jest.fn(),
    };
    localization = {
      resolveLabels: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeckInventoryService,
        {
          provide: getRepositoryToken(Deck),
          useValue: deckRepo,
        },
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: itemRepo,
        },
        {
          provide: getRepositoryToken(Listing),
          useValue: listingRepo,
        },
        {
          provide: CatalogLocalizationService,
          useValue: localization,
        },
      ],
    }).compile();

    service = module.get<DeckInventoryService>(DeckInventoryService);
  });

  it("calculates missing deck copies accurately (INT-01 acceptance: 4 required, 2 available = 2 missing)", async () => {
    deckRepo.findOne.mockResolvedValue({
      id: 10,
      cards: [
        {
          card: card1,
          qty: 4, // 4 copies required
        } as DeckCard,
      ],
    });

    // User owns 3 total copies, but 1 is reserved for sale! Available = 2
    itemRepo.find.mockResolvedValue([
      {
        id: 1,
        pokemonCard: card1,
        collection: { name: "Mon Classeur" },
        quantity: 3,
        quantityAvailable: 2, // Only 2 available!
        quantityReserved: 1,
      },
      {
        // A copy in Wishlist must NOT count
        id: 2,
        pokemonCard: card1,
        collection: { name: "Wishlist" },
        quantity: 1,
        quantityAvailable: 1,
      },
    ]);

    listingRepo.find.mockResolvedValue([
      {
        id: 101,
        price: 5.5,
        currency: "EUR",
        quantityAvailable: 3,
        shippingCost: 2.0,
        cardState: "NM",
        seller: { id: 99, firstName: "Brock", lastName: "Gym" },
      },
    ]);

    const res = await service.getDeckInventoryRequirements(10, mockUser);

    expect(res.totalCardsRequired).toBe(4);
    expect(res.totalCardsOwned).toBe(2);
    expect(res.totalCardsMissing).toBe(2);
    expect(res.isFullyOwned).toBe(false);

    const cardReq = res.cards[0];
    expect(cardReq.requiredQuantity).toBe(4);
    expect(cardReq.ownedAvailableQuantity).toBe(2);
    expect(cardReq.missingQuantity).toBe(2);
    expect(cardReq.offers).toHaveLength(1);
    expect(cardReq.offers[0].price).toBe(5.5);
    expect(cardReq.offers[0].sellerName).toBe("Brock Gym");
  });
});
