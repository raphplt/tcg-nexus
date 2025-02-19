import { Test, TestingModule } from '@nestjs/testing';
import { PokemonCardController } from './pokemon-card.controller';
import { PokemonCardService } from './pokemon-card.service';

describe('PokemonCardController', () => {
  let controller: PokemonCardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PokemonCardController],
      providers: [PokemonCardService],
    }).compile();

    controller = module.get<PokemonCardController>(PokemonCardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
