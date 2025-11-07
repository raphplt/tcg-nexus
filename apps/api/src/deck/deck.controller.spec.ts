import { Test, TestingModule } from '@nestjs/testing';
import { DeckController } from './deck.controller';
import { DeckService } from './deck.service';

describe('DeckController', () => {
  let controller: DeckController;

  const mockDeckService = {
    createDeck: jest.fn(),
    findAll: jest.fn(),
    findAllFromUser: jest.fn(),
    findOneWithCards: jest.fn(),
    updateDeck: jest.fn(),
    remove: jest.fn(),
    cloneDeck: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeckController],
      providers: [
        {
          provide: DeckService,
          useValue: mockDeckService
        }
      ]
    }).compile();

    controller = module.get<DeckController>(DeckController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
