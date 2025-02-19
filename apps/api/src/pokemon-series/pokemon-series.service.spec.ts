import { Test, TestingModule } from '@nestjs/testing';
import { PokemonSeriesService } from './pokemon-series.service';

describe('PokemonSeriesService', () => {
  let service: PokemonSeriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PokemonSeriesService],
    }).compile();

    service = module.get<PokemonSeriesService>(PokemonSeriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
