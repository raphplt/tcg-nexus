import { Test, TestingModule } from '@nestjs/testing';
import { PokemonSetController } from './pokemon-set.controller';
import { PokemonSetService } from './pokemon-set.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PokemonSet } from './entities/pokemon-set.entity';

describe('PokemonSetController', () => {
  let controller: PokemonSetController;

  const mockPokemonSetService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PokemonSetController],
      providers: [
        {
          provide: PokemonSetService,
          useValue: mockPokemonSetService
        },
        {
          provide: getRepositoryToken(PokemonSet),
          useValue: {}
        }
      ]
    }).compile();

    controller = module.get<PokemonSetController>(PokemonSetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
