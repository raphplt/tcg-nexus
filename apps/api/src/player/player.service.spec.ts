import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlayerService } from './player.service';
import { Player } from './entities/player.entity';
import { Ranking } from 'src/ranking/entities/ranking.entity';

describe('PlayerService', () => {
  let service: PlayerService;
  const playerRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn()
  };
  const rankingRepo = {
    find: jest.fn(),
    createQueryBuilder: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        { provide: getRepositoryToken(Player), useValue: playerRepo },
        { provide: getRepositoryToken(Ranking), useValue: rankingRepo }
      ]
    }).compile();

    service = module.get<PlayerService>(PlayerService);
    jest.clearAllMocks();
  });

  it('returns empty history when no rankings', async () => {
    playerRepo.findOne.mockResolvedValue({ id: 1, user: { id: 1 } });
    rankingRepo.find.mockResolvedValue([]);

    const result = await service.getTournamentHistory(1, 'all');

    expect(result.playerId).toBe(1);
    expect(result.history).toHaveLength(0);
    expect(result.stats.totalTournaments).toBe(0);
  });
});
