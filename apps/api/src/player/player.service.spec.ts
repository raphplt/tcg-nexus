import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Ranking } from "src/ranking/entities/ranking.entity";
import { TournamentStatus } from "src/tournament/entities/tournament.entity";
import { Player } from "./entities/player.entity";
import { PlayerService } from "./player.service";

describe("PlayerService", () => {
  let service: PlayerService;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const playerRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const rankingRepo = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        { provide: getRepositoryToken(Player), useValue: playerRepo },
        { provide: getRepositoryToken(Ranking), useValue: rankingRepo },
      ],
    }).compile();

    service = module.get<PlayerService>(PlayerService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create, findAll, findOne, update, remove", () => {
    it("should create a player", async () => {
      const result = await service.create({ xp: 100 } as any);
      expect((result as any).id).toBe(1);
    });

    it("should find all players", async () => {
      playerRepo.find.mockResolvedValue([{ id: 1 }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it("should find one player by id", async () => {
      playerRepo.findOne.mockResolvedValue({ id: 1 });
      const result = await service.findOne(1);
      expect(result.id).toBe(1);
    });

    it("should throw NotFoundException if player not found", async () => {
      playerRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it("should update player", async () => {
      playerRepo.findOne.mockResolvedValue({ id: 1, xp: 0 });
      const result = await service.update(1, { xp: 200 } as any);
      expect(result.xp).toBe(200);
    });

    it("should remove player", async () => {
      playerRepo.findOne.mockResolvedValue({ id: 1 });
      const result = await service.remove(1);
      expect(result).toEqual({ success: true });
    });
  });

  describe("getTournamentHistory", () => {
    it("returns empty history when no rankings", async () => {
      playerRepo.findOne.mockResolvedValue({ id: 1, user: { id: 1 } });
      rankingRepo.find.mockResolvedValue([]);

      const result = await service.getTournamentHistory(1, "all");

      expect(result.playerId).toBe(1);
      expect(result.history).toHaveLength(0);
      expect(result.stats.totalTournaments).toBe(0);
    });

    it("calculates tournament history, ELO deltas, and stats with finished tournaments", async () => {
      playerRepo.findOne.mockResolvedValue({ id: 1, user: { id: 1 } });

      const ranking = {
        rank: 1,
        points: 10,
        wins: 3,
        losses: 0,
        draws: 0,
        winRate: "100",
        tournament: {
          id: 10,
          name: "Championship",
          status: TournamentStatus.FINISHED,
          endDate: new Date(),
        },
      };

      rankingRepo.find.mockResolvedValue([ranking]);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { tournamentId: "10", count: "4" },
      ]);

      const result = await service.getTournamentHistory(1, "1m");

      expect(result.history).toHaveLength(1);
      expect(result.history[0].eloDelta).toBeDefined();
      expect(result.stats.totalWins).toBe(3);
      expect(result.stats.bestRank).toBe(1);
    });

    it("should throw NotFoundException if player not found for history", async () => {
      playerRepo.findOne.mockResolvedValue(null);
      await expect(service.getTournamentHistory(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
