import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadgeService, BadgeStats } from "./badge.service";
import { Badge, BadgeCategory } from "./entities/badge.entity";
import { UserBadge } from "./entities/user-badge.entity";

describe("BadgeService", () => {
  let service: BadgeService;

  const mockBadgeRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve(entity)),
    count: jest.fn(),
  };

  const mockUserBadgeRepo = {
    find: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve(entity)),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BadgeService,
        {
          provide: getRepositoryToken(Badge),
          useValue: mockBadgeRepo,
        },
        {
          provide: getRepositoryToken(UserBadge),
          useValue: mockUserBadgeRepo,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<BadgeService>(BadgeService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("onModuleInit & seedBadges", () => {
    it("should seed default badges if not existing", async () => {
      mockBadgeRepo.findOne.mockResolvedValue(null);
      await service.onModuleInit();
      expect(mockBadgeRepo.save).toHaveBeenCalled();
    });
  });

  describe("getUserBadges", () => {
    it("should return user badges", async () => {
      mockUserBadgeRepo.find.mockResolvedValue([{ id: 1 }]);
      const result = await service.getUserBadges(1);
      expect(result).toEqual([{ id: 1 }]);
      expect(mockUserBadgeRepo.find).toHaveBeenCalledWith({
        where: { user: { id: 1 } },
        relations: ["badge"],
        order: { unlockedAt: "DESC" },
      });
    });
  });

  describe("checkAndAwardBadges", () => {
    it("should award badges and emit event when thresholds are reached", async () => {
      const badge = {
        id: 1,
        code: "first_card",
        name: "First Card",
        category: BadgeCategory.COLLECTION,
        threshold: 1,
      } as Badge;

      mockBadgeRepo.find.mockResolvedValue([badge]);
      mockUserBadgeRepo.find.mockResolvedValue([]); // not unlocked yet

      const stats: BadgeStats = {
        totalCards: 5,
        totalDecks: 1,
        totalWins: 2,
        totalListings: 1,
        totalPurchases: 1,
      };

      await service.checkAndAwardBadges(1, stats);

      expect(mockUserBadgeRepo.save).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith("badge.unlocked", {
        userId: 1,
        badgeName: "First Card",
        badgeCode: "first_card",
      });
    });

    it("should skip already unlocked badges", async () => {
      const badge = { id: 1, code: "first_card", threshold: 1 } as Badge;
      mockBadgeRepo.find.mockResolvedValue([badge]);
      mockUserBadgeRepo.find.mockResolvedValue([{ badge }]); // already unlocked

      const stats: BadgeStats = {
        totalCards: 5,
        totalDecks: 0,
        totalWins: 0,
        totalListings: 0,
        totalPurchases: 0,
      };

      await service.checkAndAwardBadges(1, stats);
      expect(mockUserBadgeRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("getNextBadgeProgress", () => {
    it("should return closest badge progress", async () => {
      const badge1 = {
        id: 1,
        code: "collector_10",
        name: "Collector 10",
        icon: "layers",
        description: "10 cards",
        threshold: 10,
      } as Badge;

      mockBadgeRepo.find.mockResolvedValue([badge1]);
      mockUserBadgeRepo.find.mockResolvedValue([]);

      const stats: BadgeStats = {
        totalCards: 6,
        totalDecks: 0,
        totalWins: 0,
        totalListings: 0,
        totalPurchases: 0,
      };

      const result = await service.getNextBadgeProgress(1, stats);
      expect(result).toBeDefined();
      expect(result?.code).toBe("collector_10");
      expect(result?.progress).toBe(60);
      expect(result?.current).toBe(6);
    });

    it("should return null if all badges are unlocked", async () => {
      const badge1 = { id: 1, code: "b1", threshold: 1 } as Badge;
      mockBadgeRepo.find.mockResolvedValue([badge1]);
      mockUserBadgeRepo.find.mockResolvedValue([{ badge: badge1 }]);

      const result = await service.getNextBadgeProgress(1, {
        totalCards: 1,
        totalDecks: 0,
        totalWins: 0,
        totalListings: 0,
        totalPurchases: 0,
      });

      expect(result).toBeNull();
    });
  });

  describe("getTotalBadgeCount", () => {
    it("should return total count of badges", async () => {
      mockBadgeRepo.count.mockResolvedValue(12);
      const result = await service.getTotalBadgeCount();
      expect(result).toBe(12);
    });
  });
});
