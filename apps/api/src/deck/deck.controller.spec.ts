import { Test, TestingModule } from '@nestjs/testing';
import { DeckController } from './deck.controller';
import { DeckService } from './deck.service';

describe('DeckController', () => {
  let controller: DeckController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeckController],
      providers: [DeckService],
    }).compile();

    controller = module.get<DeckController>(DeckController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
