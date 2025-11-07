import { Test, TestingModule } from '@nestjs/testing';
import { PokemonSetService } from './pokemon-set.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PokemonSet } from './entities/pokemon-set.entity';
import { Repository } from 'typeorm';

describe('PokemonSetService', () => {
  let service: PokemonSetService;
  let repository: Repository<PokemonSet>;

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
    repository = module.get<Repository<PokemonSet>>(
      getRepositoryToken(PokemonSet)
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
