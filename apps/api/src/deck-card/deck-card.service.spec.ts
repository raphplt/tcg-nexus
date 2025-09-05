import { Test, TestingModule } from '@nestjs/testing';
import { DeckCardService } from './deck-card.service';

describe('DeckCardService', () => {
  let service: DeckCardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeckCardService],
    }).compile();

    service = module.get<DeckCardService>(DeckCardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
