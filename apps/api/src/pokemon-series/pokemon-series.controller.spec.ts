import { Test, TestingModule } from '@nestjs/testing';
import { PokemonSeriesController } from './pokemon-series.controller';
import { PokemonSeriesService } from './pokemon-series.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PokemonSerie } from './entities/pokemon-serie.entity';

describe('PokemonSeriesController', () => {
  let controller: PokemonSeriesController;

  const mockPokemonSeriesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    import: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PokemonSeriesController],
      providers: [
        {
          provide: PokemonSeriesService,
          useValue: mockPokemonSeriesService
        },
        {
          provide: getRepositoryToken(PokemonSerie),
          useValue: {}
        }
      ]
    }).compile();

    controller = module.get<PokemonSeriesController>(PokemonSeriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
