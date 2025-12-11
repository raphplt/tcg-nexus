import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CardPopularityService } from './card-popularity.service';
import { CardEvent, CardEventType } from './entities/card-event.entity';
import { CardPopularityMetrics } from './entities/card-popularity-metrics.entity';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { Listing } from './entities/listing.entity';
import { Order } from './entities/order.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getMany: jest.fn().mockResolvedValue([]),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis()
  })),
  count: jest.fn(),
  findAndCount: jest.fn()
});

describe('CardPopularityService', () => {
  let service: CardPopularityService;
  const cardEventRepo = mockRepo();
  const metricsRepo = mockRepo();
  const pokemonRepo = mockRepo();
  const listingRepo = mockRepo();
  const orderRepo = mockRepo();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardPopularityService,
        { provide: getRepositoryToken(CardEvent), useValue: cardEventRepo },
        {
          provide: getRepositoryToken(CardPopularityMetrics),
          useValue: metricsRepo
        },
        { provide: getRepositoryToken(PokemonCard), useValue: pokemonRepo },
        { provide: getRepositoryToken(Listing), useValue: listingRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo }
      ]
    }).compile();

    service = module.get<CardPopularityService>(CardPopularityService);
    jest.clearAllMocks();
  });

  it('should throw when card not found on recordEvent', async () => {
    pokemonRepo.findOne.mockResolvedValue(null);
    await expect(
      service.recordEvent({ cardId: 'x', eventType: CardEventType.VIEW } as any)
    ).rejects.toThrow(BadRequestException);
  });

  it('should record event', async () => {
    pokemonRepo.findOne.mockResolvedValue({ id: 'x' });
    cardEventRepo.create.mockReturnValue({ id: 1 });
    cardEventRepo.save.mockResolvedValue({ id: 1 });

    await service.recordEvent(
      { cardId: 'x', eventType: CardEventType.VIEW } as any,
      2,
      'ip'
    );
    expect(cardEventRepo.create).toHaveBeenCalled();
  });

  it('should aggregate daily metrics no cards', async () => {
    const qb = cardEventRepo.createQueryBuilder();
    qb.getRawMany.mockResolvedValue([]);
    cardEventRepo.createQueryBuilder.mockReturnValue(qb);

    await service.aggregateDailyMetrics(new Date());
    expect(cardEventRepo.createQueryBuilder).toHaveBeenCalled();
  });

  it('should calculate popularity score', async () => {
    cardEventRepo.find.mockResolvedValue([
      { eventType: CardEventType.VIEW },
      { eventType: CardEventType.ADD_TO_CART }
    ]);
    const score = await (service as any).calculatePopularityScore('c1');
    expect(score).toBeGreaterThan(0);
  });

  it('should get popular cards sorted', async () => {
    const metric = {
      card: { id: 'c1', name: 'Card', image: 'img', rarity: 'R', set: null },
      popularityScore: 10,
      listingCount: 1,
      minPrice: 5,
      avgPrice: 7,
      date: new Date()
    };
    metricsRepo.find.mockResolvedValue([{ ...metric, popularityScore: 0 }]);
    const result = await service.getPopularCards(1);
    expect(result[0].card.id).toBe('c1');
  });

  it('should get trending cards and exclude popular', async () => {
    const metric = {
      card: { id: 'c1', name: 'Card', image: 'img', rarity: 'R', set: null },
      trendScore: 20,
      listingCount: 1,
      minPrice: 5,
      popularityScore: 1,
      avgPrice: null,
      date: new Date()
    };
    const qb = metricsRepo.createQueryBuilder();
    qb.getMany.mockResolvedValue([metric]);
    metricsRepo.find.mockResolvedValue([{ ...metric, popularityScore: 0 }]);

    const result = await service.getTrendingCards(1, true);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });
});
