import { Test, TestingModule } from '@nestjs/testing';
import { DeckService } from './deck.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeckCard } from '../deck-card/entities/deck-card.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { DeckFormat } from '../deck-format/entities/deck-format.entity';
import { Deck } from './entities/deck.entity';
import { DeckShare } from './entities/deck-share.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PaginationHelper } from '../helpers/pagination';
import { DeckCardRole } from '../common/enums/deckCardRole';
import { PokemonCardsType } from '../common/enums/pokemonCardsType';
import { UserRole } from 'src/common/enums/user';

describe('DeckService', () => {
  let service: DeckService;
  let deckCardRepo: any;
  let pokemonCardRepo: any;
  let deckFormatRepo: any;
  let deckRepo: any;
  let deckShareRepo: any;

  const createQueryBuilderMock = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis()
  });

  beforeEach(async () => {
    deckCardRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      findOneBy: jest.fn(),
      delete: jest.fn()
    };

    pokemonCardRepo = {
      findOneBy: jest.fn()
    };

    deckFormatRepo = {
      findOneBy: jest.fn()
    };

    deckRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      findOne: jest.fn(),
      remove: jest.fn(),
      increment: jest.fn(),
      createQueryBuilder: jest.fn()
    };

    deckShareRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      findOne: jest.fn(),
      findOneBy: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeckService,
        {
          provide: getRepositoryToken(DeckCard),
          useValue: deckCardRepo
        },
        {
          provide: getRepositoryToken(PokemonCard),
          useValue: pokemonCardRepo
        },
        {
          provide: getRepositoryToken(DeckFormat),
          useValue: deckFormatRepo
        },
        {
          provide: getRepositoryToken(Deck),
          useValue: deckRepo
        },
        {
          provide: getRepositoryToken(DeckShare),
          useValue: deckShareRepo
        }
      ]
    }).compile();

    service = module.get<DeckService>(DeckService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDeck', () => {
    it('creates a deck with cards and sets a cover card', async () => {
      deckFormatRepo.findOneBy.mockResolvedValue({ id: 'fmt1' });
      const cardMap: Record<string, any> = {
        c1: { id: 'c1', name: 'First' },
        c2: { id: 'c2', name: 'Second' }
      };
      pokemonCardRepo.findOneBy.mockImplementation(async ({ id }) => cardMap[id]);
      const createdDeck = { id: 1, name: 'Deck' };
      deckRepo.create.mockReturnValue(createdDeck);
      const expectedDeck = { ...createdDeck, cards: [] };
      deckRepo.findOne.mockResolvedValue(expectedDeck);

      const dto = {
        deckName: 'My deck',
        isPublic: true,
        formatId: 'fmt1',
        cards: [
          { cardId: 'c1', qty: 2, role: DeckCardRole.main },
          { cardId: 'c2', qty: 1, role: DeckCardRole.side }
        ]
      } as any;

      const result = await service.createDeck({ id: 10 } as any, dto);

      expect(deckRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My deck',
          coverCard: cardMap.c1
        })
      );
      expect(pokemonCardRepo.findOneBy).toHaveBeenCalledTimes(3);
      expect(deckCardRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ card: cardMap.c1, qty: 2 }),
          expect.objectContaining({ card: cardMap.c2, qty: 1 })
        ])
      );
      expect(result).toEqual(expectedDeck);
    });

    it('throws when format is missing', async () => {
      deckFormatRepo.findOneBy.mockResolvedValue(null);
      await expect(
        service.createDeck({} as any, {
          formatId: 'missing',
          cards: []
        } as any)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when a card is missing', async () => {
      deckFormatRepo.findOneBy.mockResolvedValue({ id: 'fmt' });
      pokemonCardRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.createDeck({} as any, {
          formatId: 'fmt',
          cards: [{ cardId: 'missing', qty: 1, role: DeckCardRole.main }]
        } as any)
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(deckCardRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll / findAllFromUser', () => {
    it('applies filters when finding all public decks', async () => {
      const qb = createQueryBuilderMock();
      deckRepo.createQueryBuilder.mockReturnValue(qb);
      jest
        .spyOn(PaginationHelper, 'paginateQueryBuilder')
        .mockResolvedValue('paginated' as any);

      const result = await service.findAll({
        formatId: 3,
        search: 'fire',
        sortBy: 'format.type',
        sortOrder: 'ASC',
        page: 2,
        limit: 5
      });

      expect(qb.andWhere).toHaveBeenCalledWith('format.id = :formatId', {
        formatId: 3
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'LOWER(deck.name) LIKE LOWER(:search)',
        { search: '%fire%' }
      );
      expect(PaginationHelper.paginateQueryBuilder).toHaveBeenCalledWith(
        qb,
        { page: 2, limit: 5 },
        'format.type',
        'ASC'
      );
      expect(result).toBe('paginated');
    });

    it('filters by user and uses deck fields for ordering', async () => {
      const qb = createQueryBuilderMock();
      deckRepo.createQueryBuilder.mockReturnValue(qb);
      jest
        .spyOn(PaginationHelper, 'paginateQueryBuilder')
        .mockResolvedValue('userDecks' as any);

      const user = { id: 5 } as any;
      const result = await service.findAllFromUser(user, { sortBy: 'name' });

      expect(qb.andWhere).toHaveBeenCalledWith('user.id = :userId', {
        userId: 5
      });
      expect(PaginationHelper.paginateQueryBuilder).toHaveBeenCalledWith(
        qb,
        { page: 1, limit: 20 },
        'deck.name',
        'DESC'
      );
      expect(result).toBe('userDecks');
    });
  });

  describe('findOneWithCards', () => {
    it('throws when deck is missing', async () => {
      deckRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneWithCards(42)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('returns the deck when found', async () => {
      const deck = { id: 1 } as any;
      deckRepo.findOne.mockResolvedValue(deck);

      const result = await service.findOneWithCards(1);

      expect(result).toBe(deck);
    });
  });

  describe('analyzeDeck', () => {
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
            card: {
              id: 'p1',
              name: 'Salameche',
              category: PokemonCardsType.Pokemon,
              types: ['Fire'],
              attacks: [{ cost: ['Fire', 'Colorless'] }]
            }
          },
          {
            qty: 2,
            card: {
              id: 'p2',
              name: 'Carapuce',
              category: PokemonCardsType.Pokemon,
              types: ['Water'],
              attacks: [{ cost: ['Water'] }]
            }
          },
          {
            qty: 8,
            card: {
              id: 'e1',
              name: 'Energie Feu',
              category: PokemonCardsType.Energy,
              attacks: []
            }
          },
          {
            qty: 1,
            card: {
              id: 't1',
              name: 'Dresseur',
              category: PokemonCardsType.Trainer,
              attacks: []
            }
          },
          {
            qty: 5,
            card: {
              id: 'p3',
              name: 'Pikachu',
              category: PokemonCardsType.Pokemon,
              types: ['Lightning'],
              attacks: [{ cost: ['Lightning'] }]
            }
          },
          {
            qty: 1,
            card: undefined
          }
        ]
      });

      const result = await service.analyzeDeck(1);

      expect(result.totalCards).toBe(21);
      expect(result.energyCount).toBe(8);
      expect(result.attackCostDistribution.find((d) => d.cost === 2)?.count).toBe(4);
      expect(result.duplicates).toContainEqual(
        expect.objectContaining({ cardId: 'p3', qty: 5 })
      );
      expect(result.warnings.some((w) => w.includes('limite'))).toBeTruthy();
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(
        result.missingCards.find((s) =>
          s.label.toLowerCase().includes('énergie') ||
          s.label.toLowerCase().includes('energie')
        )
      ).toBeDefined();
    });

    it('flags decks that are too large and multi-type', async () => {
      deckRepo.findOne.mockResolvedValue({
        id: 2,
        cards: [
          {
            qty: 40,
            card: {
              id: 'e',
              name: 'Energy',
              category: PokemonCardsType.Energy,
              types: ['Fire'],
              attacks: []
            }
          },
          {
            qty: 20,
            card: {
              id: 'p',
              name: 'Dragonite',
              category: PokemonCardsType.Pokemon,
              types: ['Dragon'],
              attacks: [{ cost: ['Colorless', 'Colorless', 'Colorless', 'Colorless'] }]
            }
          },
          {
            qty: 10,
            card: {
              id: 'p2',
              name: 'Blastoise',
              category: PokemonCardsType.Pokemon,
              types: ['Water'],
              attacks: [{ cost: ['Water'] }]
            }
          },
          {
            qty: 10,
            card: {
              id: 'p3',
              name: 'Venusaur',
              category: PokemonCardsType.Pokemon,
              types: ['Grass'],
              attacks: [{ cost: ['Grass', 'Colorless'] }]
            }
          },
          {
            qty: 5,
            card: {
              id: 't',
              name: 'Supporter',
              category: PokemonCardsType.Trainer,
              attacks: []
            }
          }
        ]
      });

      const result = await service.analyzeDeck(2);

      expect(result.totalCards).toBe(85);
      expect(result.warnings.find((w) => w.includes('trop grand'))).toBeDefined();
      expect(result.suggestions.find((s) => s.includes('Deck multi-type'))).toBeDefined();
    });
  });

  describe('updateDeck', () => {
    const baseDto = {
      cardsToAdd: [],
      cardsToUpdate: [],
      cardsToRemove: []
    } as any;

    it('throws when deck is missing', async () => {
      deckRepo.findOne.mockResolvedValue(null);
      await expect(service.updateDeck(1, { id: 1 } as any, baseDto)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('throws when format is missing', async () => {
      deckRepo.findOne.mockResolvedValue({ id: 1, cards: [], user: { id: 1 } });
      deckFormatRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateDeck(
          1,
          { id: 1 } as any,
          { ...baseDto, formatId: 'missing' }
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when a card to add is missing', async () => {
      deckRepo.findOne.mockResolvedValue({ id: 1, cards: [], user: { id: 1 } });
      deckFormatRepo.findOneBy.mockResolvedValue({ id: 'fmt' });
      pokemonCardRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateDeck(
          1,
          { id: 1 } as any,
          {
            ...baseDto,
            formatId: 'fmt',
            cardsToAdd: [{ cardId: 'missing', qty: 1, role: DeckCardRole.main }]
          }
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when a card to update is missing', async () => {
      deckRepo.findOne.mockResolvedValue({ id: 1, cards: [], user: { id: 1 } });
      deckFormatRepo.findOneBy.mockResolvedValue({ id: 'fmt' });
      pokemonCardRepo.findOneBy.mockResolvedValue({ id: 'c1' });
      deckCardRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateDeck(
          1,
          { id: 1 } as any,
          {
            ...baseDto,
            formatId: 'fmt',
            cardsToAdd: [{ cardId: 'c1', qty: 1, role: DeckCardRole.main }],
            cardsToUpdate: [{ id: 99, qty: 3 }]
          }
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates fields and cards', async () => {
      const deck = { id: 1, name: 'Old', isPublic: false, cards: [], user: { id: 1 } };
      deckRepo.findOne.mockResolvedValue(deck);
      deckFormatRepo.findOneBy.mockResolvedValue({ id: 'fmt2' });
      pokemonCardRepo.findOneBy.mockResolvedValue({ id: 'card-add' });
      deckCardRepo.findOneBy.mockResolvedValue({ id: 5, qty: 1, role: DeckCardRole.main });
      const updatedDeck = { ...deck, name: 'New', isPublic: true };
      deckRepo.findOne.mockResolvedValueOnce(deck).mockResolvedValueOnce(updatedDeck);

      const result = await service.updateDeck(
        1,
        { id: 1 } as any,
        {
          deckName: 'New',
          isPublic: true,
          formatId: 'fmt2',
          cardsToRemove: [{ id: 2 }],
          cardsToAdd: [{ cardId: 'card-add', qty: 2, role: DeckCardRole.side }],
          cardsToUpdate: [{ id: 5, qty: 4, role: DeckCardRole.main }]
        } as any
      );

      expect(deck.name).toBe('New');
      expect(deck.isPublic).toBe(true);
      expect(deckCardRepo.delete).toHaveBeenCalledWith([2]);
      expect(deckCardRepo.save).toHaveBeenCalled();
      expect(result).toEqual(updatedDeck);
    });

    it('keeps deck when no card changes are provided', async () => {
      const deck = { id: 2, name: 'Name', isPublic: false, cards: [], user: { id: 1 } };
      deckRepo.findOne.mockResolvedValue(deck);
      deckRepo.findOne.mockResolvedValueOnce(deck).mockResolvedValueOnce(deck);

      const result = await service.updateDeck(
        2,
        { id: 1 } as any,
        { ...baseDto, deckName: 'Updated' } as any
      );

      expect(deck.name).toBe('Updated');
      expect(deckCardRepo.delete).not.toHaveBeenCalled();
      expect(result).toEqual(deck);
    });
  });

  describe('remove', () => {
    it('throws when deck does not exist', async () => {
      deckRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removes deck', async () => {
      const deck = { id: 1, name: 'Demo' };
      deckRepo.findOne.mockResolvedValue(deck);

      const result = await service.remove(1);

      expect(deckRepo.remove).toHaveBeenCalledWith(deck);
      expect(result).toEqual({ message: 'Deck Demo supprimé avec succès' });
    });
  });

  describe('cloneDeck', () => {
    it('throws when deck is not found', async () => {
      deckRepo.findOne.mockResolvedValue(null);
      await expect(service.cloneDeck(1, { id: 1 } as any)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('throws when user is not allowed', async () => {
      deckRepo.findOne.mockResolvedValue({
        id: 1,
        user: { id: 2 },
        cards: []
      });

      await expect(service.cloneDeck(1, { id: 1, role: UserRole.USER } as any)).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it('clones deck for authorized user', async () => {
      const deck = {
        id: 1,
        name: 'Base',
        isPublic: true,
        user: { id: 1 },
        format: { id: 'fmt' },
        cards: [
          { card: { id: 'c1' }, qty: 2, role: DeckCardRole.main },
          { card: { id: 'c2' }, qty: 1, role: DeckCardRole.side }
        ]
      };
      deckRepo.findOne.mockResolvedValue(deck);
      deckRepo.create.mockReturnValue({ id: 2, name: 'Base (copy)' });
      deckRepo.save.mockResolvedValue({ id: 2 });
      deckRepo.findOne.mockResolvedValueOnce(deck).mockResolvedValueOnce({ ...deck, id: 2 });

      const result = await service.cloneDeck(1, { id: 1 } as any);

      expect(deckCardRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ deck: { id: 2 }, card: { id: 'c1' } })
        ])
      );
      expect(result.id).toBe(2);
    });
  });

  describe('incrementViews', () => {
    it('increments the counter', async () => {
      await service.incrementViews(1);
      expect(deckRepo.increment).toHaveBeenCalledWith({ id: 1 }, 'views', 1);
    });
  });

  describe('shareDeck', () => {
    it('throws when deck is missing', async () => {
      deckRepo.findOne.mockResolvedValue(null);
      await expect(service.shareDeck(1, { id: 1 } as any)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('generates a unique share code', async () => {
      deckRepo.findOne.mockResolvedValue({ id: 1, user: { id: 1 } });
      deckShareRepo.findOneBy
        .mockResolvedValueOnce({ code: 'DUPLICATE' })
        .mockResolvedValueOnce(null);

      const result = await service.shareDeck(1, { id: 1 } as any, {
        expiresAt: '2025-01-01'
      });

      expect(deckShareRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deck: { id: 1, user: { id: 1 } },
          expiresAt: new Date('2025-01-01')
        })
      );
      expect(result.code).toHaveLength(8);
    });
  });

  describe('importDeck', () => {
    it('throws when code is invalid', async () => {
      deckShareRepo.findOne.mockResolvedValue(null);
      await expect(service.importDeck('invalid', {} as any)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('throws when code is expired', async () => {
      deckShareRepo.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000)
      });
      await expect(service.importDeck('old', {} as any)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('clones the shared deck', async () => {
      const sharedDeck = {
        id: 3,
        name: 'Shared',
        isPublic: true,
        user: { id: 10 },
        format: { id: 'fmt' },
        cards: [{ card: { id: 'c1' }, qty: 1, role: DeckCardRole.main }]
      };
      deckShareRepo.findOne.mockResolvedValue({
        code: 'CODE',
        deck: sharedDeck,
        expiresAt: null
      });
      deckRepo.create.mockReturnValue({ id: 4, name: 'Shared' });
      deckRepo.save.mockResolvedValue({ id: 4 });
      deckRepo.findOne.mockResolvedValue({ ...sharedDeck, id: 4 });

      const result = await service.importDeck('CODE', { id: 2 } as any);

      expect(deckCardRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ deck: { id: 4 } })])
      );
      expect(result.id).toBe(4);
    });
  });

  describe('getDeckForImport', () => {
    it('throws when code is invalid', async () => {
      deckShareRepo.findOne.mockResolvedValue(null);
      await expect(service.getDeckForImport('oops')).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('throws when code is expired', async () => {
      deckShareRepo.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000)
      });
      await expect(service.getDeckForImport('old')).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('returns the shared deck', async () => {
      const deck = { id: 9 };
      deckShareRepo.findOne.mockResolvedValue({
        deck,
        expiresAt: null
      });

      const result = await service.getDeckForImport('valid');

      expect(result).toBe(deck);
    });
  });

  describe('utility helpers', () => {
    it('builds distributions and cost distributions', () => {
      const typeDist = (service as any).mapToDistribution(
        new Map([['A', 2], ['B', 1]]),
        3
      );
      expect(typeDist[0]).toEqual({ label: 'A', count: 2, percentage: 67 });
      expect(typeDist[1]).toEqual({ label: 'B', count: 1, percentage: 33 });

      const costDist = (service as any).mapCostDistribution(new Map([[1, 1], [3, 2]]), 3);
      expect(costDist[0]).toEqual({ cost: 1, count: 1, percentage: 33 });
      expect(costDist[1]).toEqual({ cost: 3, count: 2, percentage: 67 });
    });

    it('evaluates energy balance for low and high ratios', () => {
      const warnings: string[] = [];
      const suggestions: string[] = [];
      (service as any).evaluateEnergyBalance(0, 20, 40, 4, warnings, suggestions);
      expect(warnings.find((w) => w.includes("Pas assez d'énergies"))).toBeDefined();
      expect(warnings.find((w) => w.includes('Aucune énergie'))).toBeDefined();
      expect(
        suggestions.find((s) => s.toLowerCase().includes('accélération'))
      ).toBeDefined();

      const highWarnings: string[] = [];
      const highSuggestions: string[] = [];
      (service as any).evaluateEnergyBalance(30, 10, 40, 1, highWarnings, highSuggestions);
      expect(highWarnings.find((w) => w.includes('Beaucoup d'))).toBeDefined();
      expect(highSuggestions.find((s) => s.includes('Réduisez'))).toBeDefined();
    });

    it('builds missing card suggestions', () => {
      const suggestions = (service as any).buildMissingCardsSuggestions({
        energyCount: 5,
        pokemonCount: 20,
        trainerCount: 5,
        totalCards: 40,
        typeDistribution: [{ label: 'Fire', count: 10, percentage: 25 }],
        averageEnergyCost: 3.5
      });

      expect(suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Énergies' }),
          expect.objectContaining({ label: 'Dresseurs de pioche' }),
          expect.objectContaining({ label: 'Support Fire' }),
          expect.objectContaining({ label: "Accélération d'énergie" })
        ])
      );
    });
  });
});
