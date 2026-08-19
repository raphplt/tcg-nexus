import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Match } from "../match/entities/match.entity";
import { Player } from "../player/entities/player.entity";
import {
  Tournament,
  TournamentType,
} from "../tournament/entities/tournament.entity";
import { CreateRankingDto } from "./dto/create-ranking.dto";
import { UpdateRankingDto } from "./dto/update-ranking.dto";
import { RankedMatchHistory } from "./entities/ranked-match-history.entity";
import { Ranking } from "./entities/ranking.entity";
import { RankingService } from "./ranking.service";

describe("RankingService", () => {
  let service: RankingService;
  let rankingRepo: any;
  let tournamentRepo: any;
  let playerRepo: any;
  let matchRepo: any;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockRankingRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockTournamentRepo = {
    findOne: jest.fn(),
  };

  const mockPlayerRepo = {
    findOne: jest.fn(),
    save: jest.fn((p) => Promise.resolve(p)),
  };

  const mockMatchRepo = {
    find: jest.fn(),
  };

  const mockRankedHistoryRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve(dto)),
    query: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingService,
        { provide: getRepositoryToken(Ranking), useValue: mockRankingRepo },
        {
          provide: getRepositoryToken(Tournament),
          useValue: mockTournamentRepo,
        },
        { provide: getRepositoryToken(Player), useValue: mockPlayerRepo },
        { provide: getRepositoryToken(Match), useValue: mockMatchRepo },
        {
          provide: getRepositoryToken(RankedMatchHistory),
          useValue: mockRankedHistoryRepo,
        },
      ],
    }).compile();

    service = module.get<RankingService>(RankingService);
    rankingRepo = module.get(getRepositoryToken(Ranking));
    tournamentRepo = module.get(getRepositoryToken(Tournament));
    playerRepo = module.get(getRepositoryToken(Player));
    matchRepo = module.get(getRepositoryToken(Match));

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("global ranking", () => {
    it("paginates ranking rows in PostgreSQL", async () => {
      mockRankedHistoryRepo.query.mockResolvedValue([
        {
          rank: "2",
          oldRank: "4",
          userId: "12",
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          avatarUrl: null,
          score: "1240",
          total: "42",
        },
      ]);

      const result = await service.getGlobalRanking(2, 20, "week");

      expect(result).toEqual({
        data: [
          {
            rank: 2,
            userId: 12,
            pseudo: "Ada Lovelace",
            avatarUrl: null,
            score: 1240,
            tendency: "up",
          },
        ],
        total: 42,
        page: 2,
        limit: 20,
      });
      expect(mockRankedHistoryRepo.query).toHaveBeenCalledWith(
        expect.stringContaining("LEFT JOIN LATERAL"),
        expect.arrayContaining([20, 20]),
      );
    });

    it("retains the total for an empty page", async () => {
      mockRankedHistoryRepo.query.mockResolvedValue([
        {
          rank: null,
          oldRank: null,
          userId: null,
          firstName: null,
          lastName: null,
          email: null,
          avatarUrl: null,
          score: null,
          total: "8",
        },
      ]);

      const result = await service.getGlobalRanking(10, 20);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(8);
    });
  });

  describe("create", () => {
    it("should create a ranking successfully", async () => {
      const dto: CreateRankingDto = {
        tournamentId: 1,
        playerId: 2,
        rank: 0,
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      };
      tournamentRepo.findOne.mockResolvedValue({ id: 1 });
      playerRepo.findOne.mockResolvedValue({ id: 2 });
      rankingRepo.create.mockReturnValue(dto);
      rankingRepo.save.mockResolvedValue({ id: 1, ...dto });

      const result = await service.create(dto);
      expect(result.id).toBe(1);
      expect(rankingRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException if tournament not found", async () => {
      tournamentRepo.findOne.mockResolvedValue(null);
      const dto: CreateRankingDto = {
        tournamentId: 99,
        playerId: 2,
        rank: 0,
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      };
      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if player not found", async () => {
      tournamentRepo.findOne.mockResolvedValue({ id: 1 });
      playerRepo.findOne.mockResolvedValue(null);
      const dto: CreateRankingDto = {
        tournamentId: 1,
        playerId: 99,
        rank: 0,
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      };
      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAll", () => {
    it("should find all rankings", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([{ id: 1 }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it("should filter by tournamentId", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([{ id: 1 }]);

      await service.findAll(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "tournament.id = :tournamentId",
        { tournamentId: 1 },
      );
    });
  });

  describe("findOne", () => {
    it("should find one ranking", async () => {
      rankingRepo.findOne.mockResolvedValue({ id: 1 });
      const result = await service.findOne(1);
      expect(result).toEqual({ id: 1 });
    });

    it("should throw NotFoundException if not found", async () => {
      rankingRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update ranking", async () => {
      const existing = { id: 1, points: 0 };
      rankingRepo.findOne.mockResolvedValue(existing);
      rankingRepo.save.mockImplementation((r: any) => r);
      const dto: UpdateRankingDto = { points: 10 };

      const result = await service.update(1, dto);
      expect(result.points).toBe(10);
    });
  });

  describe("remove", () => {
    it("should remove ranking", async () => {
      rankingRepo.findOne.mockResolvedValue({ id: 1 });
      await service.remove(1);
      expect(rankingRepo.remove).toHaveBeenCalled();
    });
  });

  describe("getTournamentRankings", () => {
    it("should return rankings for tournament", async () => {
      rankingRepo.find.mockResolvedValue([{ id: 1 }]);
      const result = await service.getTournamentRankings(1);
      expect(result).toHaveLength(1);
      expect(rankingRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tournament: { id: 1 } } }),
      );
    });
  });

  describe("getPlayerRanking", () => {
    it("should return ranking for player and tournament", async () => {
      rankingRepo.findOne.mockResolvedValue({ id: 1 });
      const result = await service.getPlayerRanking(1, 2);
      expect(result!.id).toBe(1);
    });
  });

  describe("getFinalRankings", () => {
    it("should return final rankings", async () => {
      tournamentRepo.findOne.mockResolvedValue({ id: 1 });
      rankingRepo.find.mockResolvedValue([{ id: 1 }]);
      const result = await service.getFinalRankings(1);
      expect(result).toHaveLength(1);
    });

    it("should throw NotFoundException if tournament not found", async () => {
      tournamentRepo.findOne.mockResolvedValue(null);
      await expect(service.getFinalRankings(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateTournamentRankings", () => {
    const player1 = { id: 1 } as Player;
    const player2 = { id: 2 } as Player;
    const player3 = { id: 3 } as Player;

    it("should calculate Swiss System points correctly", async () => {
      const matches = [
        {
          id: 1,
          playerA: player1,
          playerB: player2,
          finishedAt: new Date(),
          winner: player1,
        }, // P1 win
        {
          id: 2,
          playerA: player2,
          playerB: player3,
          finishedAt: new Date(),
          winner: null,
        }, // Draw
        {
          id: 3,
          playerA: player3,
          playerB: player1,
          finishedAt: new Date(),
          winner: player1,
        }, // P1 win
      ] as Match[];

      tournamentRepo.findOne.mockResolvedValue({
        id: 1,
        type: TournamentType.SWISS_SYSTEM,
        matches,
      });

      rankingRepo.find.mockResolvedValue([]);
      rankingRepo.findOne.mockResolvedValue(null);
      rankingRepo.create.mockImplementation((dto: any) => dto);
      rankingRepo.save.mockImplementation((arr: any[]) => arr);

      const result = await service.updateTournamentRankings(1);

      const p1 = result.find((r) => r.player.id === 1);
      expect(p1!.wins).toBe(2);
      expect(p1!.points).toBe(6); // 3 per win

      const p2 = result.find((r) => r.player.id === 2);
      expect(p2!.losses).toBe(1);
      expect(p2!.draws).toBe(1);
      expect(p2!.points).toBe(1); // 1 per draw

      expect(p1!.rank).toBe(1);
    });

    it("should calculate Single Elimination points correctly", async () => {
      const matches = [
        {
          id: 1,
          playerA: player1,
          playerB: player2,
          finishedAt: new Date(),
          winner: player1,
        },
      ] as Match[];

      tournamentRepo.findOne.mockResolvedValue({
        id: 1,
        type: TournamentType.SINGLE_ELIMINATION,
        matches,
      });

      rankingRepo.find.mockResolvedValue([]);
      rankingRepo.findOne.mockResolvedValue(null);
      rankingRepo.create.mockImplementation((dto: any) => dto);
      rankingRepo.save.mockImplementation((arr: any[]) => arr);

      const result = await service.updateTournamentRankings(1);
      const p1 = result.find((r) => r.player.id === 1);
      expect(p1!.points).toBe(1); // 1 per win in Elimination
    });

    it("should throw NotFoundException if tournament not found", async () => {
      tournamentRepo.findOne.mockResolvedValue(null);
      await expect(service.updateTournamentRankings(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("calculateTieBreakers", () => {
    it("should calculate opponent win rates and game win rates", async () => {
      const player1 = { id: 1 } as Player;
      const player2 = { id: 2 } as Player;
      const matches = [
        {
          id: 1,
          playerA: player1,
          playerB: player2,
          finishedAt: new Date(),
          winner: player1,
          playerAScore: 2,
          playerBScore: 0,
          tournament: { id: 1 },
        },
      ] as Match[];

      matchRepo.find.mockResolvedValue(matches);

      const result = await service.calculateTieBreakers(1, [1, 2]);
      const p1Stats = result.get(1);
      expect(p1Stats!.gameWinRate).toBe(1);
      expect(p1Stats!.opponentWinRate).toBe(0);

      const p2Stats = result.get(2);
      expect(p2Stats!.gameWinRate).toBe(0);
      expect(p2Stats!.opponentWinRate).toBe(1);
    });

    it("should handle players with no matches", async () => {
      matchRepo.find.mockResolvedValue([]);
      const result = await service.calculateTieBreakers(1, [1]);
      const p1Stats = result.get(1);
      expect(p1Stats).toBeDefined();
      expect(p1Stats!.opponentWinRate).toBe(0);
    });
  });

  describe("getMyRankingPosition & ELO methods", () => {
    it("should return user ranking position from query", async () => {
      playerRepo.findOne.mockResolvedValue({ id: 1, user: { id: 10, email: "u@t.co" }, elo: 1200 });
      mockRankedHistoryRepo.query.mockResolvedValue([
        {
          rank: "5",
          oldRank: "6",
          userId: "10",
          firstName: "John",
          lastName: "Doe",
          score: "1200",
        },
      ]);

      const pos = await service.getMyRankingPosition(10, "week");
      expect(pos.rank).toBe(5);
      expect(pos.tendency).toBe("up");
    });

    it("should fallback to player elo when user not yet in ranked table", async () => {
      playerRepo.findOne.mockResolvedValue({ id: 1, user: { id: 10, email: "u@t.co", firstName: "A", lastName: "B" }, elo: 1050 });
      mockRankedHistoryRepo.query.mockResolvedValue([]);

      const pos = await service.getMyRankingPosition(10);
      expect(pos.rank).toBe(0);
      expect(pos.score).toBe(1050);
    });

    it("should update ELO on win and on draw", async () => {
      const p1 = { id: 1, elo: 1000 };
      const p2 = { id: 2, elo: 1000 };
      playerRepo.findOne.mockImplementation(({ where: { user: { id } } }) =>
        Promise.resolve(id === 1 ? p1 : p2),
      );
      playerRepo.save.mockImplementation((p: any) => Promise.resolve(p));

      const winRes = await service.updateElo(1, 2, false);
      expect(winRes.winnerElo).toBeGreaterThan(1000);
      expect(winRes.loserElo).toBeLessThan(1000);

      // Draw
      p1.elo = 1000;
      p2.elo = 1000;
      const drawRes = await service.updateElo(1, 2, true);
      expect(drawRes.winnerElo).toBe(1000);
      expect(drawRes.loserElo).toBe(1000);
    });

    it("should update ELO with history record", async () => {
      const p1 = { id: 1, elo: 1000 };
      const p2 = { id: 2, elo: 1000 };
      playerRepo.findOne.mockImplementation(({ where: { user: { id } } }) =>
        Promise.resolve(id === 1 ? p1 : p2),
      );
      playerRepo.save.mockImplementation((p: any) => Promise.resolve(p));

      const res = await service.updateEloWithHistory(1, 2, { casualSessionId: 42 });
      expect(res.delta).toBeGreaterThan(0);
      expect(mockRankedHistoryRepo.save).toHaveBeenCalled();
    });

    it("should get ELO for user and get recent ELO history", async () => {
      playerRepo.findOne.mockResolvedValue({ id: 1, elo: 1150 });
      const elo = await service.getEloForUser(1);
      expect(elo).toBe(1150);

      const history = await service.getRecentEloHistory(1, 10);
      expect(Array.isArray(history)).toBe(true);
    });
  });
});
