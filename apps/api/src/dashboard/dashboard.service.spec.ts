import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadgeService } from "src/badge/badge.service";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { Collection } from "src/collection/entities/collection.entity";
import { Deck } from "src/deck/entities/deck.entity";
import { CardEvent } from "src/marketplace/entities/card-event.entity";
import { Listing } from "src/marketplace/entities/listing.entity";
import { Order } from "src/marketplace/entities/order.entity";
import { OrderItem } from "src/marketplace/entities/order-item.entity";
import { Player } from "src/player/entities/player.entity";
import { Ranking } from "src/ranking/entities/ranking.entity";
import { User } from "src/user/entities/user.entity";
import { DashboardService } from "./dashboard.service";

describe("DashboardService", () => {
  let service: DashboardService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getCount: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  const mockCollectionRepo = {
    find: jest.fn(),
  };
  const mockCollectionItemRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };
  const mockDeckRepo = {
    find: jest.fn(),
  };
  const mockPlayerRepo = {
    findOne: jest.fn(),
  };
  const mockRankingRepo = {
    find: jest.fn(),
  };
  const mockListingRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };
  const mockOrderRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };
  const mockOrderItemRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };
  const mockCardEventRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockBadgeService = {
    checkAndAwardBadges: jest.fn(),
    getUserBadges: jest.fn().mockResolvedValue([]),
    getTotalBadgeCount: jest.fn().mockResolvedValue(10),
    getNextBadgeProgress: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Collection), useValue: mockCollectionRepo },
        { provide: getRepositoryToken(CollectionItem), useValue: mockCollectionItemRepo },
        { provide: getRepositoryToken(Deck), useValue: mockDeckRepo },
        { provide: getRepositoryToken(Player), useValue: mockPlayerRepo },
        { provide: getRepositoryToken(Ranking), useValue: mockRankingRepo },
        { provide: getRepositoryToken(Listing), useValue: mockListingRepo },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepo },
        { provide: getRepositoryToken(CardEvent), useValue: mockCardEventRepo },
        { provide: BadgeService, useValue: mockBadgeService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getDashboard", () => {
    it("should aggregate dashboard statistics with valid user data", async () => {
      const user = {
        id: 1,
        createdAt: new Date(),
        isActive: true,
      } as User;

      // Collection
      mockCollectionRepo.find.mockResolvedValue([{ id: 10 }]);
      mockQueryBuilder.getMany.mockResolvedValueOnce([
        {
          quantity: 2,
          added_at: new Date(),
          pokemonCard: {
            pricing: { cardmarket: { avg: 15.5 } },
          },
        },
      ]);

      // Tournaments & Player
      mockPlayerRepo.findOne.mockResolvedValue({ id: "p-1" });
      mockRankingRepo.find.mockResolvedValue([
        {
          wins: 3,
          losses: 1,
          rank: 1,
          tournament: { status: "finished" },
        },
      ]);

      // Decks
      mockDeckRepo.find.mockResolvedValue([
        { id: "d-1", name: "Fire Deck", views: 42 },
      ]);

      // Marketplace: active listings, revenue, purchases
      mockQueryBuilder.getCount.mockResolvedValueOnce(3); // active listings
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ revenue: "150.00" }) // sales revenue
        .mockResolvedValueOnce({ count: "2", spent: "80.00" }); // purchases

      // Activity
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        { date: new Date().toISOString().split("T")[0], count: "5" },
      ]);

      // Badges
      mockBadgeService.getUserBadges.mockResolvedValue([
        {
          badge: {
            code: "FIRST_CARD",
            name: "First Card",
            icon: "star",
            category: "collection",
          },
          unlockedAt: new Date(),
        },
      ]);

      const dashboard = await service.getDashboard(user);

      expect(dashboard).toBeDefined();
      expect(dashboard.collection.totalCards).toBe(2);
      expect(dashboard.collection.estimatedValue).toBe(31);
      expect(dashboard.tournaments.played).toBe(1);
      expect(dashboard.tournaments.winRate).toBe(75);
      expect(dashboard.decks.total).toBe(1);
      expect(dashboard.marketplace.activeListings).toBe(3);
      expect(dashboard.marketplace.totalRevenue).toBe(150);
      expect(dashboard.badges.unlocked).toHaveLength(1);
      expect(dashboard.activity).toHaveLength(7);
    });

    it("should handle empty collections, no player, and empty decks gracefully", async () => {
      const user = { id: 2, createdAt: new Date(), isActive: true } as User;

      mockCollectionRepo.find.mockResolvedValue([]);
      mockPlayerRepo.findOne.mockResolvedValue(null);
      mockDeckRepo.find.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ revenue: "0" })
        .mockResolvedValueOnce({ count: "0", spent: "0" });
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const dashboard = await service.getDashboard(user);

      expect(dashboard.collection.totalCards).toBe(0);
      expect(dashboard.tournaments.played).toBe(0);
      expect(dashboard.tournaments.bestRank).toBeNull();
      expect(dashboard.decks.total).toBe(0);
      expect(dashboard.decks.mostUsed).toBeNull();
      expect(dashboard.marketplace.activeListings).toBe(0);
    });
  });
});
