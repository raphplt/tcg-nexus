import { Test, TestingModule } from '@nestjs/testing';
import { DeckFormatService } from './deck-format.service';

describe('DeckFormatService', () => {
  let service: DeckFormatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeckFormatService],
    }).compile();

    service = module.get<DeckFormatService>(DeckFormatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
