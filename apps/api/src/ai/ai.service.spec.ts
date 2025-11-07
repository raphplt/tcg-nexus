import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AiService } from './ai.service';
import { Deck } from '../deck/entities/deck.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { PokemonCardsType } from '../common/enums/pokemonCardsType';

describe('AiService', () => {
  let service: AiService;

  const mockDeckRepo = {
    findOne: jest.fn()
  };

  const mockPokemonCardRepo = {
    find: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: getRepositoryToken(Deck),
          useValue: mockDeckRepo
        },
        {
          provide: getRepositoryToken(PokemonCard),
          useValue: mockPokemonCardRepo
        }
      ]
    }).compile();

    service = module.get<AiService>(AiService);
    deckRepo = module.get<Repository<Deck>>(getRepositoryToken(Deck));
    pokemonCardRepo = module.get<Repository<PokemonCard>>(
      getRepositoryToken(PokemonCard)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeDeck', () => {
    it('should throw NotFoundException when deck is not found', async () => {
      mockDeckRepo.findOne.mockResolvedValue(null);

      await expect(service.analyzeDeck({ deckId: 999 })).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when no deckId or cardIds provided', async () => {
      await expect(service.analyzeDeck({})).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when no cards found by cardIds', async () => {
      mockPokemonCardRepo.find.mockResolvedValue([]);

      await expect(
        service.analyzeDeck({ cardIds: ['invalid-id'] })
      ).rejects.toThrow(BadRequestException);
    });

    it('should analyze a deck by deckId successfully', async () => {
      const mockPokemonCards = [
        {
          id: 'card1',
          name: 'Pikachu',
          category: PokemonCardsType.Pokemon,
          types: ['Lightning'],
          attacks: [
            { cost: ['Lightning', 'Colorless'], name: 'Thunder', damage: 80 }
          ]
        },
        {
          id: 'card2',
          name: 'Lightning Energy',
          category: PokemonCardsType.Energy
        },
        {
          id: 'card3',
          name: 'Professor Research',
          category: PokemonCardsType.Trainer
        }
      ];

      const mockDeck = {
        id: 1,
        cards: [
          { card: mockPokemonCards[0], qty: 2 },
          { card: mockPokemonCards[1], qty: 20 },
          { card: mockPokemonCards[2], qty: 4 }
        ]
      };

      mockDeckRepo.findOne.mockResolvedValue(mockDeck);

      const result = await service.analyzeDeck({ deckId: 1 });

      expect(result).toBeDefined();
      expect(result.deckId).toBe(1);
      expect(result.totalCards).toBe(26);
      expect(result.typeDistribution).toBeDefined();
      expect(result.categoryDistribution).toBeDefined();
      expect(result.duplicates).toBeDefined();
      expect(result.synergies).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should analyze cards by cardIds successfully', async () => {
      const mockPokemonCards = [
        {
          id: 'card1',
          name: 'Charizard',
          category: PokemonCardsType.Pokemon,
          types: ['Fire'],
          attacks: [
            { cost: ['Fire', 'Fire', 'Fire'], name: 'Fire Blast', damage: 120 }
          ]
        },
        {
          id: 'card2',
          name: 'Fire Energy',
          category: PokemonCardsType.Energy
        }
      ];

      mockPokemonCardRepo.find.mockResolvedValue(mockPokemonCards);

      const result = await service.analyzeDeck({
        cardIds: ['card1', 'card2', 'card2']
      });

      expect(result).toBeDefined();
      expect(result.deckId).toBeUndefined();
      expect(result.totalCards).toBe(3);
    });

    it('should detect duplicates correctly', async () => {
      const mockPokemonCard = {
        id: 'card1',
        name: 'Mewtwo',
        category: PokemonCardsType.Pokemon,
        types: ['Psychic']
      };

      const mockDeck = {
        id: 1,
        cards: [{ card: mockPokemonCard, qty: 4 }]
      };

      mockDeckRepo.findOne.mockResolvedValue(mockDeck);

      const result = await service.analyzeDeck({ deckId: 1 });

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].cardId).toBe('card1');
      expect(result.duplicates[0].count).toBe(4);
    });

    it('should provide warnings for incomplete deck', async () => {
      const mockPokemonCard = {
        id: 'card1',
        name: 'Eevee',
        category: PokemonCardsType.Pokemon,
        types: ['Colorless']
      };

      const mockDeck = {
        id: 1,
        cards: [{ card: mockPokemonCard, qty: 10 }]
      };

      mockDeckRepo.findOne.mockResolvedValue(mockDeck);

      const result = await service.analyzeDeck({ deckId: 1 });

      expect(result.warnings).toContain('Deck incomplet: 10/60 cartes');
    });

    it('should provide recommendations for energy distribution', async () => {
      const mockPokemonCards = [
        {
          id: 'card1',
          name: 'Snorlax',
          category: PokemonCardsType.Pokemon,
          types: ['Colorless']
        },
        {
          id: 'card2',
          name: 'Colorless Energy',
          category: PokemonCardsType.Energy
        }
      ];

      const mockDeck = {
        id: 1,
        cards: [
          { card: mockPokemonCards[0], qty: 50 },
          { card: mockPokemonCards[1], qty: 10 }
        ]
      };

      mockDeckRepo.findOne.mockResolvedValue(mockDeck);

      const result = await service.analyzeDeck({ deckId: 1 });

      expect(result.recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining('énergie')])
      );
    });

    it('should detect type synergies', async () => {
      const mockPokemonCards = [
        {
          id: 'card1',
          name: 'Blastoise',
          category: PokemonCardsType.Pokemon,
          types: ['Water']
        },
        {
          id: 'card2',
          name: 'Squirtle',
          category: PokemonCardsType.Pokemon,
          types: ['Water']
        },
        {
          id: 'card3',
          name: 'Wartortle',
          category: PokemonCardsType.Pokemon,
          types: ['Water']
        }
      ];

      const mockDeck = {
        id: 1,
        cards: mockPokemonCards.map((card) => ({ card, qty: 2 }))
      };

      mockDeckRepo.findOne.mockResolvedValue(mockDeck);

      const result = await service.analyzeDeck({ deckId: 1 });

      const waterSynergy = result.synergies.find(
        (s) => s.type === 'energy-type'
      );
      expect(waterSynergy).toBeDefined();
      expect(waterSynergy?.description).toContain('Water');
    });

    it('should detect evolution synergies', async () => {
      const mockPokemonCards = [
        {
          id: 'card1',
          name: 'Charmander',
          category: PokemonCardsType.Pokemon,
          types: ['Fire']
        },
        {
          id: 'card2',
          name: 'Charmeleon',
          category: PokemonCardsType.Pokemon,
          types: ['Fire'],
          evolveFrom: 'Charmander'
        }
      ];

      const mockDeck = {
        id: 1,
        cards: mockPokemonCards.map((card) => ({ card, qty: 2 }))
      };

      mockDeckRepo.findOne.mockResolvedValue(mockDeck);

      const result = await service.analyzeDeck({ deckId: 1 });

      const evolutionSynergy = result.synergies.find(
        (s) => s.type === 'evolution'
      );
      expect(evolutionSynergy).toBeDefined();
      expect(evolutionSynergy?.description).toContain('Charmander');
    });

    it('should detect trainer support synergies', async () => {
      const mockPokemonCards = [
        {
          id: 'card1',
          name: 'Professor Oak',
          category: PokemonCardsType.Trainer
        },
        {
          id: 'card2',
          name: 'Bill',
          category: PokemonCardsType.Trainer
        },
        {
          id: 'card3',
          name: 'Computer Search',
          category: PokemonCardsType.Trainer
        },
        {
          id: 'card4',
          name: 'Energy Removal',
          category: PokemonCardsType.Trainer
        },
        {
          id: 'card5',
          name: 'Gust of Wind',
          category: PokemonCardsType.Trainer
        }
      ];

      const mockDeck = {
        id: 1,
        cards: mockPokemonCards.map((card) => ({ card, qty: 2 }))
      };

      mockDeckRepo.findOne.mockResolvedValue(mockDeck);

      const result = await service.analyzeDeck({ deckId: 1 });

      const trainerSynergy = result.synergies.find(
        (s) => s.type === 'trainer-support'
      );
      expect(trainerSynergy).toBeDefined();
      expect(trainerSynergy?.cardIds).toHaveLength(5);
    });
  });
});
