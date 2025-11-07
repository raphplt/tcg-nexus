import { Test, TestingModule } from '@nestjs/testing';
import { DeckFormatController } from './deck-format.controller';
import { DeckFormatService } from './deck-format.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeckFormat } from './entities/deck-format.entity';

describe('DeckFormatController', () => {
  let controller: DeckFormatController;

  const mockDeckFormatService = {
    findAll: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeckFormatController],
      providers: [
        {
          provide: DeckFormatService,
          useValue: mockDeckFormatService
        },
        {
          provide: getRepositoryToken(DeckFormat),
          useValue: {}
        }
      ]
    }).compile();

    controller = module.get<DeckFormatController>(DeckFormatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
