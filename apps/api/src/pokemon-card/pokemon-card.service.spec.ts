import { Test, TestingModule } from '@nestjs/testing';
import { PokemonCardService } from './pokemon-card.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PokemonCard } from './entities/pokemon-card.entity';
import { Repository } from 'typeorm';

describe('PokemonCardService', () => {
  let service: PokemonCardService;
  let repository: Repository<PokemonCard>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn()
    }))
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PokemonCardService,
        {
          provide: getRepositoryToken(PokemonCard),
          useValue: mockRepository
        }
      ]
    }).compile();

    service = module.get<PokemonCardService>(PokemonCardService);
    repository = module.get<Repository<PokemonCard>>(
      getRepositoryToken(PokemonCard)
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
