import { Test, TestingModule } from '@nestjs/testing';
import { DeckCardController } from './deck-card.controller';
import { DeckCardService } from './deck-card.service';

describe('DeckCardController', () => {
  let controller: DeckCardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeckCardController],
      providers: [DeckCardService],
    }).compile();

    controller = module.get<DeckCardController>(DeckCardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
