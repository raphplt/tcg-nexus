import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Player } from "../player/entities/player.entity";
import { ChallengeService } from "./challenge.service";
import { ActiveChallenge } from "./entities/active-challenge.entity";
import { Challenge } from "./entities/challenge.entity";
import { UserChallenge } from "./entities/user-challenge.entity";
import { ChallengeActionType, ChallengeType } from "./enums/challenge.enum";

describe("ChallengeService", () => {
  let service: ChallengeService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockChallengeRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockActiveChallengeRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
  };

  const mockUserChallengeRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve(entity)),
  };

  const mockPlayerRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    save: jest.fn(),
    query: jest.fn().mockResolvedValue([{ pg_try_advisory_lock: true }]),
  };

  const mockDataSource = {
    transaction: jest.fn((cb) => cb(mockEntityManager)),
    query: jest.fn().mockResolvedValue([{ pg_try_advisory_lock: true }]),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengeService,
        {
          provide: getRepositoryToken(Challenge),
          useValue: mockChallengeRepo,
        },
        {
          provide: getRepositoryToken(ActiveChallenge),
          useValue: mockActiveChallengeRepo,
        },
        {
          provide: getRepositoryToken(UserChallenge),
          useValue: mockUserChallengeRepo,
        },
        {
          provide: getRepositoryToken(Player),
          useValue: mockPlayerRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<ChallengeService>(ChallengeService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getActiveChallenges", () => {
    it("should return daily and weekly challenges with user progress", async () => {
      const dailyChallenge = {
        id: 1,
        challenge: { id: 10, title: "Win a match", type: ChallengeType.DAILY },
        expiresAt: new Date(),
      };
      const weeklyChallenge = {
        id: 2,
        challenge: {
          id: 20,
          title: "Play 10 matches",
          type: ChallengeType.WEEKLY,
        },
        expiresAt: new Date(),
      };

      mockActiveChallengeRepo.find
        .mockResolvedValueOnce([dailyChallenge])
        .mockResolvedValueOnce([weeklyChallenge]);

      mockUserChallengeRepo.find.mockResolvedValue([
        {
          id: 100,
          activeChallenge: { id: 1 },
          progress: 1,
          isCompleted: true,
          isClaimed: false,
        },
      ]);

      const result = await service.getActiveChallenges(1);

      expect(result.daily).toHaveLength(1);
      expect(result.daily[0].progress).toBe(1);
      expect(result.daily[0].isCompleted).toBe(true);
      expect(result.weekly).toHaveLength(1);
      expect(result.weekly[0].progress).toBe(0);
    });
  });

  describe("rotateDailyChallenges and rotateWeeklyChallenges", () => {
    it("should rotate daily challenges using advisory lock", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        { id: 1, type: ChallengeType.DAILY },
      ]);
      await service.rotateDailyChallenges();
      expect(mockActiveChallengeRepo.delete).toHaveBeenCalled();
      expect(mockActiveChallengeRepo.save).toHaveBeenCalled();
    });

    it("should rotate weekly challenges using advisory lock", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        { id: 2, type: ChallengeType.WEEKLY },
      ]);
      await service.rotateWeeklyChallenges();
      expect(mockActiveChallengeRepo.delete).toHaveBeenCalled();
      expect(mockActiveChallengeRepo.save).toHaveBeenCalled();
    });
  });

  describe("handleAction", () => {
    it("should ignore invalid challenge actions", async () => {
      await service.handleAction({ userId: 1, action: "INVALID_ACTION" });
      expect(mockActiveChallengeRepo.find).not.toHaveBeenCalled();
    });

    it("should increment progress for active challenges matching the action", async () => {
      const active = {
        id: 1,
        challenge: {
          id: 10,
          actionType: ChallengeActionType.WIN_MATCH,
          targetValue: 2,
        },
      };
      mockActiveChallengeRepo.find.mockResolvedValue([active]);
      mockUserChallengeRepo.findOne.mockResolvedValue(null);

      await service.handleAction({
        userId: 1,
        action: ChallengeActionType.WIN_MATCH,
      });

      expect(mockUserChallengeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 1,
          isCompleted: false,
        }),
      );
    });
  });

  describe("claimChallenge", () => {
    it("should throw NotFoundException if progress not found", async () => {
      mockEntityManager.findOne.mockResolvedValueOnce(null);
      await expect(service.claimChallenge(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException if challenge not completed", async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({
        isCompleted: false,
      });
      await expect(service.claimChallenge(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException if already claimed", async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({
        isCompleted: true,
        isClaimed: true,
      });
      await expect(service.claimChallenge(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should claim reward and award XP to player", async () => {
      const userChallenge = {
        id: 10,
        isCompleted: true,
        isClaimed: false,
        activeChallenge: {
          challenge: { rewardXp: 150 },
        },
      };
      const player = {
        id: "p-1",
        xp: 50,
        level: 1,
      };

      mockEntityManager.findOne
        .mockResolvedValueOnce(userChallenge)
        .mockResolvedValueOnce(player);

      const result = await service.claimChallenge(1, 1);

      expect(result.success).toBe(true);
      expect(result.reward).toBe(150);
      expect(result.newTotalXp).toBe(200);
      expect(player.level).toBe(3); // Math.floor(200 / 100) + 1 = 3
    });
  });
});
