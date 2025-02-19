import { Test, TestingModule } from '@nestjs/testing';
import { PokemonSetController } from './pokemon-set.controller';
import { PokemonSetService } from './pokemon-set.service';

describe('PokemonSetController', () => {
  let controller: PokemonSetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PokemonSetController],
      providers: [PokemonSetService],
    }).compile();

    controller = module.get<PokemonSetController>(PokemonSetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
