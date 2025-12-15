import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RankingService } from './ranking.service';
import { Ranking } from './entities/ranking.entity';
import {
  Tournament,
  TournamentType
} from '../tournament/entities/tournament.entity';
import { Player } from '../player/entities/player.entity';
import { Match } from '../match/entities/match.entity';
import { NotFoundException } from '@nestjs/common';
import { CreateRankingDto } from './dto/create-ranking.dto';
import { UpdateRankingDto } from './dto/update-ranking.dto';

describe('RankingService', () => {
  let service: RankingService;
  let rankingRepo: any;
  let tournamentRepo: any;
  let playerRepo: any;
  let matchRepo: any;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn()
  };

  const mockRankingRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder)
  };

  const mockTournamentRepo = {
    findOne: jest.fn()
  };

  const mockPlayerRepo = {
    findOne: jest.fn()
  };

  const mockMatchRepo = {
    find: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingService,
        { provide: getRepositoryToken(Ranking), useValue: mockRankingRepo },
        {
          provide: getRepositoryToken(Tournament),
          useValue: mockTournamentRepo
        },
        { provide: getRepositoryToken(Player), useValue: mockPlayerRepo },
        { provide: getRepositoryToken(Match), useValue: mockMatchRepo }
      ]
    }).compile();

    service = module.get<RankingService>(RankingService);
    rankingRepo = module.get(getRepositoryToken(Ranking));
    tournamentRepo = module.get(getRepositoryToken(Tournament));
    playerRepo = module.get(getRepositoryToken(Player));
    matchRepo = module.get(getRepositoryToken(Match));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a ranking successfully', async () => {
      const dto: CreateRankingDto = {
        tournamentId: 1,
        playerId: 2,
        rank: 0,
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0
      };
      tournamentRepo.findOne.mockResolvedValue({ id: 1 });
      playerRepo.findOne.mockResolvedValue({ id: 2 });
      rankingRepo.create.mockReturnValue(dto);
      rankingRepo.save.mockResolvedValue({ id: 1, ...dto });

      const result = await service.create(dto);
      expect(result.id).toBe(1);
      expect(rankingRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tournament not found', async () => {
      tournamentRepo.findOne.mockResolvedValue(null);
      const dto: CreateRankingDto = {
        tournamentId: 99,
        playerId: 2,
        rank: 0,
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0
      };
      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if player not found', async () => {
      tournamentRepo.findOne.mockResolvedValue({ id: 1 });
      playerRepo.findOne.mockResolvedValue(null);
      const dto: CreateRankingDto = {
        tournamentId: 1,
        playerId: 99,
        rank: 0,
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0
      };
      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should find all rankings', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([{ id: 1 }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('should filter by tournamentId', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([{ id: 1 }]);

      await service.findAll(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'tournament.id = :tournamentId',
        { tournamentId: 1 }
      );
    });
  });

  describe('findOne', () => {
    it('should find one ranking', async () => {
      rankingRepo.findOne.mockResolvedValue({ id: 1 });
      const result = await service.findOne(1);
      expect(result).toEqual({ id: 1 });
    });

    it('should throw NotFoundException if not found', async () => {
      rankingRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update ranking', async () => {
      const existing = { id: 1, points: 0 };
      rankingRepo.findOne.mockResolvedValue(existing);
      rankingRepo.save.mockImplementation((r: any) => r);
      const dto: UpdateRankingDto = { points: 10 };

      const result = await service.update(1, dto);
      expect(result.points).toBe(10);
    });
  });

  describe('remove', () => {
    it('should remove ranking', async () => {
      rankingRepo.findOne.mockResolvedValue({ id: 1 });
      await service.remove(1);
      expect(rankingRepo.remove).toHaveBeenCalled();
    });
  });

  describe('getTournamentRankings', () => {
    it('should return rankings for tournament', async () => {
      rankingRepo.find.mockResolvedValue([{ id: 1 }]);
      const result = await service.getTournamentRankings(1);
      expect(result).toHaveLength(1);
      expect(rankingRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tournament: { id: 1 } } })
      );
    });
  });

  describe('getPlayerRanking', () => {
    it('should return ranking for player and tournament', async () => {
      rankingRepo.findOne.mockResolvedValue({ id: 1 });
      const result = await service.getPlayerRanking(1, 2);
      expect(result!.id).toBe(1);
    });
  });

  describe('getFinalRankings', () => {
    it('should return final rankings', async () => {
      tournamentRepo.findOne.mockResolvedValue({ id: 1 });
      rankingRepo.find.mockResolvedValue([{ id: 1 }]);
      const result = await service.getFinalRankings(1);
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if tournament not found', async () => {
      tournamentRepo.findOne.mockResolvedValue(null);
      await expect(service.getFinalRankings(999)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateTournamentRankings', () => {
    const player1 = { id: 1 } as Player;
    const player2 = { id: 2 } as Player;
    const player3 = { id: 3 } as Player;

    it('should calculate Swiss System points correctly', async () => {
      const matches = [
        {
          id: 1,
          playerA: player1,
          playerB: player2,
          finishedAt: new Date(),
          winner: player1
        }, // P1 win
        {
          id: 2,
          playerA: player2,
          playerB: player3,
          finishedAt: new Date(),
          winner: null
        }, // Draw
        {
          id: 3,
          playerA: player3,
          playerB: player1,
          finishedAt: new Date(),
          winner: player1
        } // P1 win
      ] as Match[];

      tournamentRepo.findOne.mockResolvedValue({
        id: 1,
        type: TournamentType.SWISS_SYSTEM,
        matches
      });

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

    it('should calculate Single Elimination points correctly', async () => {
      const matches = [
        {
          id: 1,
          playerA: player1,
          playerB: player2,
          finishedAt: new Date(),
          winner: player1
        }
      ] as Match[];

      tournamentRepo.findOne.mockResolvedValue({
        id: 1,
        type: TournamentType.SINGLE_ELIMINATION,
        matches
      });

      rankingRepo.findOne.mockResolvedValue(null);
      rankingRepo.create.mockImplementation((dto: any) => dto);
      rankingRepo.save.mockImplementation((arr: any[]) => arr);

      const result = await service.updateTournamentRankings(1);
      const p1 = result.find((r) => r.player.id === 1);
      expect(p1!.points).toBe(1); // 1 per win in Elimination
    });

    it('should throw NotFoundException if tournament not found', async () => {
      tournamentRepo.findOne.mockResolvedValue(null);
      await expect(service.updateTournamentRankings(999)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('calculateTieBreakers', () => {
    it('should calculate opponent win rates and game win rates', async () => {
      const player1 = { id: 1 } as Player;
      const player2 = { id: 2 } as Player;
      /* 
             Match 1: P1 vs P2. P1 wins 2-0.
             P1 stats: Opponents: [P2]. P2 win rate?
             P2 stats: Opponents: [P1]. P1 win rate?
           */
      const matches = [
        {
          id: 1,
          playerA: player1,
          playerB: player2,
          finishedAt: new Date(),
          winner: player1,
          playerAScore: 2,
          playerBScore: 0,
          tournament: { id: 1 }
        }
      ] as Match[];

      matchRepo.find.mockResolvedValue(matches);

      // Calculating for P1
      // P1 played P2.
      // P2 has player matches: Match 1 (loss).
      // P2 wins = 0. Total = 1. P2 Win Rate = 0.
      // P1 opponentWinRate = 0.

      // P1 Game Win Rate: Won 2 games out of 2. Rate = 1.0 (100% equivalent, but float 0-1)

      const result = await service.calculateTieBreakers(1, [1, 2]);
      const p1Stats = result.get(1);
      expect(p1Stats!.gameWinRate).toBe(1);
      expect(p1Stats!.opponentWinRate).toBe(0);

      const p2Stats = result.get(2);
      expect(p2Stats!.gameWinRate).toBe(0);
      // P2 played P1. P1 won match 1. P1 wins=1/1 -> 1.0.
      expect(p2Stats!.opponentWinRate).toBe(1);
    });

    it('should handle players with no matches', async () => {
      matchRepo.find.mockResolvedValue([]);
      const result = await service.calculateTieBreakers(1, [1]);
      const p1Stats = result.get(1);
      expect(p1Stats).toBeDefined();
      expect(p1Stats!.opponentWinRate).toBe(0);
    });
  });
});
