import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CollectionItem } from "../collection-item/entities/collection-item.entity";
import { FulfillmentStatus } from "../common/enums/fulfillment-status";
import { Deck } from "../deck/entities/deck.entity";
import { Match } from "../match/entities/match.entity";
import { MatchResultProposal } from "../match/entities/match-result-proposal.entity";
import { Order, OrderStatus } from "../marketplace/entities/order.entity";
import { TournamentDeckSnapshot } from "../tournament/entities/tournament-deck-snapshot.entity";
import { TournamentRegistration } from "../tournament/entities/tournament-registration.entity";
import { UserRole } from "../common/enums/user";
import { User } from "./entities/user.entity";
import { UserJourneyService } from "./user-journey.service";

describe("UserJourneyService", () => {
  let service: UserJourneyService;
  let orderRepo: Partial<Record<keyof Repository<Order>, jest.Mock>>;
  let deckRepo: Partial<Record<keyof Repository<Deck>, jest.Mock>>;
  let regRepo: Partial<
    Record<keyof Repository<TournamentRegistration>, jest.Mock>
  >;
  let matchRepo: Partial<Record<keyof Repository<Match>, jest.Mock>>;
  let proposalRepo: Partial<
    Record<keyof Repository<MatchResultProposal>, jest.Mock>
  >;
  let snapshotRepo: Partial<
    Record<keyof Repository<TournamentDeckSnapshot>, jest.Mock>
  >;
  let colItemRepo: Partial<Record<keyof Repository<CollectionItem>, jest.Mock>>;

  const mockUser = {
    id: 15,
    email: "journey@test.com",
    role: UserRole.USER,
  } as User;

  beforeEach(async () => {
    orderRepo = {
      find: jest.fn(),
    };

    deckRepo = {
      find: jest.fn(),
    };

    regRepo = {
      find: jest.fn(),
    };

    matchRepo = {
      find: jest.fn(),
    };

    proposalRepo = {
      find: jest.fn(),
    };

    snapshotRepo = {
      findOne: jest.fn(),
    };

    colItemRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserJourneyService,
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepo,
        },
        {
          provide: getRepositoryToken(Deck),
          useValue: deckRepo,
        },
        {
          provide: getRepositoryToken(TournamentRegistration),
          useValue: regRepo,
        },
        {
          provide: getRepositoryToken(Match),
          useValue: matchRepo,
        },
        {
          provide: getRepositoryToken(MatchResultProposal),
          useValue: proposalRepo,
        },
        {
          provide: getRepositoryToken(TournamentDeckSnapshot),
          useValue: snapshotRepo,
        },
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: colItemRepo,
        },
      ],
    }).compile();

    service = module.get<UserJourneyService>(UserJourneyService);
  });

  describe("getNextActions", () => {
    it("returns empty actions array if user has no pending obligations", async () => {
      orderRepo.find!.mockResolvedValue([]);
      regRepo.find!.mockResolvedValue([]);
      matchRepo.find!.mockResolvedValue([]);
      deckRepo.find!.mockResolvedValue([]);

      const result = await service.getNextActions(mockUser);

      expect(result.userId).toBe(mockUser.id);
      expect(result.actions).toEqual([]);
      expect(result.totalActionableCount).toBe(0);
    });

    it("aggregates pending orders, unimported receipts, and incomplete decks", async () => {
      orderRepo
        .find!.mockResolvedValueOnce([
          {
            id: 10,
            status: OrderStatus.PENDING,
            totalAmount: 45,
            currency: "EUR",
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 20,
            orderItems: [
              {
                id: 101,
                fulfillmentStatus: FulfillmentStatus.DELIVERED,
              },
            ],
          },
        ]);

      regRepo.find!.mockResolvedValue([]);
      matchRepo.find!.mockResolvedValue([]);

      deckRepo.find!.mockResolvedValue([
        {
          id: 5,
          name: "Mewtwo VSTAR",
          cards: [{ qty: 40 }],
        },
      ]);

      const result = await service.getNextActions(mockUser);

      expect(result.totalActionableCount).toBe(3);
      expect(result.actions.map((a) => a.type)).toContain("CHECKOUT_PENDING");
      expect(result.actions.map((a) => a.type)).toContain(
        "RECEIPT_IMPORT_PENDING",
      );
      expect(result.actions.map((a) => a.type)).toContain("DECK_MISSING_CARDS");
    });
  });
});
