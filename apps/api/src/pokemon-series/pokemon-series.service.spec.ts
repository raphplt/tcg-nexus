import { Test, TestingModule } from '@nestjs/testing';
import { PokemonSeriesService } from './pokemon-series.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PokemonSerie } from './entities/pokemon-serie.entity';

describe('PokemonSeriesService', () => {
  let service: PokemonSeriesService;

  const mockRepository = {
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn().mockResolvedValue({ entities: [] })
    })),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PokemonSeriesService,
        {
          provide: getRepositoryToken(PokemonSerie),
          useValue: mockRepository
        }
      ]
    }).compile();

    service = module.get<PokemonSeriesService>(PokemonSeriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
