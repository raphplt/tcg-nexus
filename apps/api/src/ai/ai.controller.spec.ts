import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AnalyzeDeckDto } from './dto/analyze-deck.dto';
import { DeckAnalysisResponseDto } from './dto/analyze-deck-response.dto';

describe('AiController', () => {
  let controller: AiController;

  const mockAiService = {
    analyzeDeck: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: mockAiService
        }
      ]
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('analyzeDeck', () => {
    it('should call service.analyzeDeck with deckId', async () => {
      const dto: AnalyzeDeckDto = { deckId: 1 };
      const mockResponse: DeckAnalysisResponseDto = {
        deckId: 1,
        totalCards: 60,
        typeDistribution: [],
        categoryDistribution: [],
        energyCostDistribution: [],
        duplicates: [],
        synergies: [],
        warnings: [],
        recommendations: []
      };

      mockAiService.analyzeDeck.mockResolvedValue(mockResponse);

      const result = await controller.analyzeDeck(dto);

      expect(mockAiService.analyzeDeck).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });

    it('should call service.analyzeDeck with cardIds', async () => {
      const dto: AnalyzeDeckDto = { cardIds: ['card1', 'card2', 'card3'] };
      const mockResponse: DeckAnalysisResponseDto = {
        totalCards: 3,
        typeDistribution: [],
        categoryDistribution: [],
        energyCostDistribution: [],
        duplicates: [],
        synergies: [],
        warnings: [],
        recommendations: []
      };

      mockAiService.analyzeDeck.mockResolvedValue(mockResponse);

      const result = await controller.analyzeDeck(dto);

      expect(mockAiService.analyzeDeck).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });

    it('should return analysis response from service', async () => {
      const dto: AnalyzeDeckDto = { deckId: 5 };
      const mockResponse: DeckAnalysisResponseDto = {
        deckId: 5,
        totalCards: 60,
        typeDistribution: [
          { type: 'Fire', count: 30, percentage: 50 },
          { type: 'Water', count: 30, percentage: 50 }
        ],
        categoryDistribution: [
          { category: 'Pokemon', count: 20, percentage: 33 },
          { category: 'Energy', count: 25, percentage: 42 },
          { category: 'Trainer', count: 15, percentage: 25 }
        ],
        energyCostDistribution: [
          { cost: 1, count: 10, percentage: 17 },
          { cost: 2, count: 10, percentage: 17 }
        ],
        duplicates: [{ cardId: 'card1', cardName: 'Pikachu', count: 4 }],
        synergies: [
          {
            type: 'energy-type',
            description: '6 cartes de type Fire détectées',
            cardIds: ['card1', 'card2', 'card3', 'card4', 'card5', 'card6']
          }
        ],
        warnings: [],
        recommendations: [
          'Ajoutez plus de cartes Trainer pour améliorer la consistance du deck'
        ]
      };

      mockAiService.analyzeDeck.mockResolvedValue(mockResponse);

      const result = await controller.analyzeDeck(dto);

      expect(result).toEqual(mockResponse);
      expect(result.typeDistribution).toHaveLength(2);
      expect(result.categoryDistribution).toHaveLength(3);
      expect(result.duplicates).toHaveLength(1);
      expect(result.synergies).toHaveLength(1);
    });
  });
});
