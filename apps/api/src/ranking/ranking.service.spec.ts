import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RankingService } from './ranking.service';
import { Ranking } from './entities/ranking.entity';
import { Tournament } from '../tournament/entities/tournament.entity';
import { Player } from '../player/entities/player.entity';
import { Match } from '../match/entities/match.entity';
import { NotFoundException } from '@nestjs/common';

const mockRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([])
  })),
  remove: jest.fn()
});

describe('RankingService', () => {
  let service: RankingService;
  const rankingRepo = mockRepo();
  const tournamentRepo = mockRepo();
  const playerRepo = mockRepo();
  const matchRepo = mockRepo();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingService,
        { provide: getRepositoryToken(Ranking), useValue: rankingRepo },
        { provide: getRepositoryToken(Tournament), useValue: tournamentRepo },
        { provide: getRepositoryToken(Player), useValue: playerRepo },
        { provide: getRepositoryToken(Match), useValue: matchRepo }
      ]
    }).compile();

    service = module.get<RankingService>(RankingService);
    jest.clearAllMocks();
  });

  it('should create ranking when tournament and player exist', async () => {
    tournamentRepo.findOne.mockResolvedValue({ id: 1 });
    playerRepo.findOne.mockResolvedValue({ id: 2 });
    rankingRepo.create.mockReturnValue({ id: 3 });
    rankingRepo.save.mockResolvedValue({ id: 3 });

    const res = await service.create({ tournamentId: 1, playerId: 2 } as any);
    expect(res.id).toBe(3);
  });

  it('should throw when tournament missing', async () => {
    tournamentRepo.findOne.mockResolvedValue(null);
    await expect(service.create({ tournamentId: 1, playerId: 2 } as any)).rejects.toThrow(
      NotFoundException
    );
  });

  it('should throw when player missing', async () => {
    tournamentRepo.findOne.mockResolvedValue({ id: 1 });
    playerRepo.findOne.mockResolvedValue(null);
    await expect(service.create({ tournamentId: 1, playerId: 2 } as any)).rejects.toThrow(
      NotFoundException
    );
  });

  it('should find all and one ranking', async () => {
    const qb = rankingRepo.createQueryBuilder();
    qb.getMany.mockResolvedValue([{ id: 1 }]);
    rankingRepo.createQueryBuilder.mockReturnValue(qb);
    await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);

    rankingRepo.findOne = jest.fn().mockResolvedValue({ id: 5 });
    await expect(service.findOne(5)).resolves.toEqual({ id: 5 });
  });

  it('should update and remove ranking', async () => {
    rankingRepo.findOne = jest.fn().mockResolvedValue({ id: 6 });
    rankingRepo.save.mockResolvedValue({ id: 6, rank: 1 });
    await expect(service.update(6, { rank: 1 } as any)).resolves.toEqual({ id: 6, rank: 1 });

    rankingRepo.remove.mockResolvedValue(undefined);
    await expect(service.remove(6)).resolves.toBeUndefined();
  });
});
