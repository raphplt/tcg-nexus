import { SeedingMethod, SeedingService, SeededPlayer } from './seeding.service';
import { Player } from '../../player/entities/player.entity';
import { Ranking } from '../../ranking/entities/ranking.entity';

const mockPlayerRepository = {};

const mockRankingRepository = {
  createQueryBuilder: jest.fn()
};

const player = (id: number): Player => ({ id, user: { firstName: `P${id}`, lastName: '' } } as any);

const qb = () => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(undefined)
  };
  return chain;
};

describe('SeedingService', () => {
  let service: SeedingService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockRankingRepository.createQueryBuilder.mockImplementation(qb);
    service = new SeedingService(
      mockPlayerRepository as any,
      mockRankingRepository as any
    );
  });

  it('uses manual seeding when method is manual', async () => {
    const players = [player(1), player(2)];
    const seeded = await service.seedPlayers(players, {} as any, SeedingMethod.MANUAL);
    expect(seeded[0].seed).toBe(1);
  });

  it('uses ranking based seeding and sorts by score', async () => {
    const players = [player(1), player(2)];
    const chain = qb();
    chain.getRawMany.mockResolvedValue([
      { ranking_playerId: '1', avgPoints: '10', avgWinRate: '50', tournamentCount: '2' },
      { ranking_playerId: '2', avgPoints: '5', avgWinRate: '60', tournamentCount: '1' }
    ]);
    mockRankingRepository.createQueryBuilder.mockReturnValue(chain);

    const seeded = await (service as any).rankingBasedSeeding(players);
    expect(seeded[0].id).toBe(1);
    expect(seeded[0].seed).toBe(1);
  });

  it('delegates ELO seeding to ranking-based', async () => {
    const spy = jest.spyOn<any, any>(service as any, 'rankingBasedSeeding').mockResolvedValue([]);
    await service.seedPlayers([player(1)], {} as any, SeedingMethod.ELO);
    expect(spy).toHaveBeenCalled();
  });

  it('validates sequential seeding', () => {
    const seeded: SeededPlayer[] = [
      { ...player(1), seed: 1 } as any,
      { ...player(2), seed: 2 } as any
    ];
    expect(service.validateSeeding(seeded)).toBe(true);
    expect(service.validateSeeding([{ ...player(1), seed: 2 } as any])).toBe(false);
  });

  it('generates balanced seeding order', () => {
    const seeded: SeededPlayer[] = [
      { ...player(1), seed: 1 },
      { ...player(2), seed: 2 },
      { ...player(3), seed: 3 },
      { ...player(4), seed: 4 }
    ] as any;

    const balanced = service.generateBalancedSeeding(seeded);
    expect(balanced[0].seed).toBe(1);
    expect(balanced.length).toBe(4);
  });

  it('computes player seeding stats with recent form', async () => {
    const statsChain = qb();
    statsChain.getRawOne.mockResolvedValue({
      avgPoints: '12',
      avgWinRate: '50',
      tournamentCount: '3',
      bestRank: '1'
    });
    const recentChain = qb();
    recentChain.getMany.mockResolvedValue([{ points: 3 }, { points: 6 }]);

    mockRankingRepository.createQueryBuilder
      .mockReturnValueOnce(statsChain)
      .mockReturnValueOnce(recentChain);

    const stats = await service.getPlayerSeedingStats(1);
    expect(stats.avgPoints).toBe(12);
    expect(stats.recentForm).toBe(4.5);
  });
});
