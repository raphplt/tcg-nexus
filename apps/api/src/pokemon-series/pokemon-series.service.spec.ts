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

  it('should create a pokemon series', async () => {
    const dto = { name: 'Series' } as any;
    mockRepository.create.mockReturnValue(dto);
    mockRepository.save.mockResolvedValue({ id: 1, ...dto });

    await expect(service.create(dto)).resolves.toEqual({ id: 1, ...dto });
  });

  it('should find all with custom query builder', async () => {
    await expect(service.findAll()).resolves.toEqual([]);
    expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('serie');
  });

  it('should find one series by id', async () => {
    mockRepository.findOne.mockResolvedValue({ id: '2', name: 'Neo' });
    await expect(service.findOne('2')).resolves.toEqual({
      id: '2',
      name: 'Neo'
    });
  });

  it('should update and return entity', async () => {
    mockRepository.update.mockResolvedValue({ affected: 1 });
    mockRepository.findOne.mockResolvedValue({ id: '3', name: 'Updated' });

    await expect(
      service.update('3', { name: 'Updated' } as any)
    ).resolves.toEqual({ id: '3', name: 'Updated' });
  });

  it('should delete series', async () => {
    mockRepository.delete.mockResolvedValue({ affected: 1 });
    await expect(service.remove('4')).resolves.toEqual({ deleted: true });
  });
});
