import { Test, TestingModule } from '@nestjs/testing';
import { CardStateService } from './card-state.service';

describe('CardStateService', () => {
  let service: CardStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CardStateService]
    }).compile();

    service = module.get<CardStateService>(CardStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
