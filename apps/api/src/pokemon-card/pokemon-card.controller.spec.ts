import { Test, TestingModule } from '@nestjs/testing';
import { PokemonCardController } from './pokemon-card.controller';
import { PokemonCardService } from './pokemon-card.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PokemonCard } from './entities/pokemon-card.entity';

describe('PokemonCardController', () => {
  let controller: PokemonCardController;

  const mockPokemonCardService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findBySearch: jest.fn(),
    findAllPaginated: jest.fn(),
    findRandom: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PokemonCardController],
      providers: [
        {
          provide: PokemonCardService,
          useValue: mockPokemonCardService
        },
        {
          provide: getRepositoryToken(PokemonCard),
          useValue: {}
        }
      ]
    }).compile();

    controller = module.get<PokemonCardController>(PokemonCardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
