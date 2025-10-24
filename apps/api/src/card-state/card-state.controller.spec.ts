import { Test, TestingModule } from '@nestjs/testing';
import { CardStateController } from './card-state.controller';
import { CardStateService } from './card-state.service';

describe('CardStateController', () => {
  let controller: CardStateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardStateController],
      providers: [CardStateService]
    }).compile();

    controller = module.get<CardStateController>(CardStateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
