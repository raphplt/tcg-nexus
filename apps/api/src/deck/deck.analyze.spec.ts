import { Test, TestingModule } from '@nestjs/testing';
import { DeckService } from './deck.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeckCard } from '../deck-card/entities/deck-card.entity';
import { Card } from '../card/entities/card.entity';
import { DeckFormat } from '../deck-format/entities/deck-format.entity';
import { Deck } from './entities/deck.entity';
import { DeckShare } from './entities/deck-share.entity';
import { NotFoundException } from '@nestjs/common';
import { PokemonCardsType } from '../common/enums/pokemonCardsType';

describe('DeckService analyzeDeck', () => {
  let service: DeckService;

  const deckRepo = {
    findOne: jest.fn()
  };

  const withPokemonDetails = <T extends Record<string, any>>(card: T) => ({
    ...card,
    pokemonDetails: {
      category: card.category,
      types: card.types,
      attacks: card.attacks
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeckService,
        { provide: getRepositoryToken(DeckCard), useValue: {} },
        { provide: getRepositoryToken(Card), useValue: {} },
        { provide: getRepositoryToken(DeckFormat), useValue: {} },
        { provide: getRepositoryToken(Deck), useValue: deckRepo },
        { provide: getRepositoryToken(DeckShare), useValue: {} }
      ]
    }).compile();

    service = module.get<DeckService>(DeckService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('throws when deck is not found', async () => {
    deckRepo.findOne.mockResolvedValue(null);
    await expect(service.analyzeDeck(99)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('returns analysis with distributions and suggestions', async () => {
    deckRepo.findOne.mockResolvedValue({
      id: 1,
      cards: [
        {
          qty: 4,
          card: withPokemonDetails({
            id: 'p1',
            name: 'Salameche',
            category: PokemonCardsType.Pokemon,
            types: ['Fire'],
            attacks: [{ cost: ['Fire', 'Colorless'] }]
          })
        },
        {
          qty: 2,
          card: withPokemonDetails({
            id: 'p2',
            name: 'Carapuce',
            category: PokemonCardsType.Pokemon,
            types: ['Water'],
            attacks: [{ cost: ['Water'] }]
          })
        },
        {
          qty: 8,
          card: withPokemonDetails({
            id: 'e1',
            name: 'Energie Feu',
            category: PokemonCardsType.Energy,
            attacks: []
          })
        },
        {
          qty: 1,
          card: withPokemonDetails({
            id: 't1',
            name: 'Dresseur',
            category: PokemonCardsType.Trainer,
            attacks: []
          })
        },
        {
          qty: 5,
          card: withPokemonDetails({
            id: 'p3',
            name: 'Pikachu',
            category: PokemonCardsType.Pokemon,
            types: ['Lightning'],
            attacks: [{ cost: ['Lightning'] }]
          })
        }
      ]
    });

    const result = await service.analyzeDeck(1);

    expect(result.totalCards).toBe(20);
    expect(result.energyCount).toBe(8);
    expect(result.typeDistribution.find((d) => d.label === 'Fire')?.count).toBe(
      4
    );
    expect(
      result.attackCostDistribution.find((d) => d.cost === 2)?.count
    ).toBe(4);
    expect(result.duplicates).toContainEqual(
      expect.objectContaining({ cardId: 'p3', qty: 5 })
    );
    expect(
      result.warnings.some((w) => w.includes('limite autorisée'))
    ).toBeTruthy();
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(
      result.missingCards.find((s) =>
        s.label.toLowerCase().includes('énergie') ||
        s.label.toLowerCase().includes('energie')
      )
    ).toBeDefined();
  });
});
