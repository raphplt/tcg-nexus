import { Test, TestingModule } from '@nestjs/testing';
import { PokemonSetService } from './pokemon-set.service';

describe('PokemonSetService', () => {
  let service: PokemonSetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PokemonSetService],
    }).compile();

    service = module.get<PokemonSetService>(PokemonSetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
