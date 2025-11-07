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
});
