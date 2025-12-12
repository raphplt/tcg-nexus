import { Test, TestingModule } from '@nestjs/testing';
import { PokemonSetService } from './pokemon-set.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PokemonSet } from './entities/pokemon-set.entity';

describe('PokemonSetService', () => {
  let service: PokemonSetService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PokemonSetService,
        {
          provide: getRepositoryToken(PokemonSet),
          useValue: mockRepository
        }
      ]
    }).compile();

    service = module.get<PokemonSetService>(PokemonSetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create pokemon set', async () => {
    const dto = { id: 'base', name: 'Base' } as any;
    mockRepository.create.mockReturnValue(dto);
    mockRepository.save.mockResolvedValue({ id: 'base' });

    await expect(service.create(dto)).resolves.toEqual({ id: 'base' });
    expect(mockRepository.create).toHaveBeenCalledWith(dto);
  });

  it('should find all ordered by releaseDate desc', async () => {
    mockRepository.find.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    await expect(service.findAll()).resolves.toHaveLength(2);
    expect(mockRepository.find).toHaveBeenCalledWith({
      order: { releaseDate: 'DESC' }
    });
  });

  it('should find one by id', async () => {
    mockRepository.findOne.mockResolvedValue({ id: '123' });
    await expect(service.findOne('123')).resolves.toEqual({ id: '123' });
  });

  it('should throw when pokemon set missing', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(
      'PokemonSet with id missing not found'
    );
  });

  it('should update and return updated set', async () => {
    mockRepository.update.mockResolvedValue({ affected: 1 });
    mockRepository.findOne.mockResolvedValue({ id: '123', name: 'Updated' });

    await expect(
      service.update('123', { name: 'Updated' } as any)
    ).resolves.toEqual({ id: '123', name: 'Updated' });
  });

  it('should remove pokemon set', async () => {
    mockRepository.delete.mockResolvedValue({ affected: 1 });
    await expect(service.remove(7)).resolves.toBeUndefined();
    expect(mockRepository.delete).toHaveBeenCalledWith(7);
  });
});
