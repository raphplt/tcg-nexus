import { Test, TestingModule } from '@nestjs/testing';
import { PokemonSeriesController } from './pokemon-series.controller';
import { PokemonSeriesService } from './pokemon-series.service';

describe('PokemonSeriesController', () => {
  let controller: PokemonSeriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PokemonSeriesController],
      providers: [PokemonSeriesService]
    }).compile();

    controller = module.get<PokemonSeriesController>(PokemonSeriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
