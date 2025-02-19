import { Test, TestingModule } from '@nestjs/testing';
import { PokemonCardService } from './pokemon-card.service';

describe('PokemonCardService', () => {
  let service: PokemonCardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PokemonCardService],
    }).compile();

    service = module.get<PokemonCardService>(PokemonCardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
