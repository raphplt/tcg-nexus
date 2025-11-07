import { Test, TestingModule } from '@nestjs/testing';
import { DeckFormatService } from './deck-format.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeckFormat } from './entities/deck-format.entity';
import { Repository } from 'typeorm';

describe('DeckFormatService', () => {
  let service: DeckFormatService;
  let repository: Repository<DeckFormat>;

  const mockRepository = {
    find: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeckFormatService,
        {
          provide: getRepositoryToken(DeckFormat),
          useValue: mockRepository
        }
      ]
    }).compile();

    service = module.get<DeckFormatService>(DeckFormatService);
    repository = module.get<Repository<DeckFormat>>(
      getRepositoryToken(DeckFormat)
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
