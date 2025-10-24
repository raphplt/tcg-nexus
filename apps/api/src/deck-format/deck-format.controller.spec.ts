import { Test, TestingModule } from '@nestjs/testing';
import { DeckFormatController } from './deck-format.controller';

describe('DeckFormatController', () => {
  let controller: DeckFormatController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeckFormatController]
    }).compile();

    controller = module.get<DeckFormatController>(DeckFormatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
