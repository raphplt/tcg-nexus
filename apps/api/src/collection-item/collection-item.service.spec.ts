import { Test, TestingModule } from '@nestjs/testing';
import { CollectionItemService } from './collection-item.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CollectionItem } from './entities/collection-item.entity';
import { Collection } from '../collection/entities/collection.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { User } from '../user/entities/user.entity';
import { CardState } from '../card-state/entities/card-state.entity';

describe('CollectionItemService', () => {
  let service: CollectionItemService;

  const mockCollectionItemRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn()
  };

  const mockCollectionRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn()
  };

  const mockPokemonCardRepo = {
    findOne: jest.fn()
  };

  const mockUserRepo = {
    findOne: jest.fn()
  };

  const mockCardStateRepo = {
    findOne: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionItemService,
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: mockCollectionItemRepo
        },
        {
          provide: getRepositoryToken(Collection),
          useValue: mockCollectionRepo
        },
        {
          provide: getRepositoryToken(PokemonCard),
          useValue: mockPokemonCardRepo
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo
        },
        {
          provide: getRepositoryToken(CardState),
          useValue: mockCardStateRepo
        }
      ]
    }).compile();

    service = module.get<CollectionItemService>(CollectionItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should add card to wishlist with default card state', async () => {
    const user = { id: 1 };
    const card = { id: 'card1' };
    const wishlist = { id: 'w', items: [] };
    const defaultState = { id: 10, code: 'NM' };
    const createdItem = { id: 5 };

    mockUserRepo.findOne.mockResolvedValue(user);
    mockPokemonCardRepo.findOne.mockResolvedValue(card);
    mockCollectionRepo.findOne.mockResolvedValue(wishlist);
    mockCardStateRepo.findOne.mockResolvedValue(defaultState);
    mockCollectionItemRepo.create.mockReturnValue(createdItem);
    mockCollectionItemRepo.save.mockResolvedValue(createdItem);

    await expect(service.addToWishlist(1, 'card1')).resolves.toEqual(
      createdItem
    );
  });

  it('should create wishlist when missing', async () => {
    const user = { id: 1 };
    const card = { id: 'card1' };
    const createdWishlist = { id: 'nw', items: [] };
    const defaultState = { id: 10, code: 'NM' };

    mockUserRepo.findOne.mockResolvedValue(user);
    mockPokemonCardRepo.findOne.mockResolvedValue(card);
    mockCollectionRepo.findOne.mockResolvedValueOnce(null);
    mockCollectionRepo.create.mockReturnValue(createdWishlist);
    mockCollectionRepo.save.mockResolvedValue(createdWishlist);
    mockCardStateRepo.findOne.mockResolvedValue(defaultState);
    mockCollectionItemRepo.create.mockReturnValue({ id: 6 });
    mockCollectionItemRepo.save.mockResolvedValue({ id: 6 });

    await expect(service.addToWishlist(1, 'card1')).resolves.toEqual({ id: 6 });
  });

  it('should increment quantity when item already in wishlist', async () => {
    const user = { id: 1 };
    const card = { id: 'card1' };
    const item = { id: 2, quantity: 1, pokemonCard: card };
    const wishlist = { id: 'w', items: [item] };

    mockUserRepo.findOne.mockResolvedValue(user);
    mockPokemonCardRepo.findOne.mockResolvedValue(card);
    mockCollectionRepo.findOne.mockResolvedValue(wishlist);
    mockCollectionItemRepo.save.mockImplementation(async (i) => i);

    const result = await service.addToWishlist(1, 'card1');
    expect(result.quantity).toBe(2);
  });

  it('should throw when user not found', async () => {
    mockUserRepo.findOne.mockResolvedValue(null);
    await expect(service.addToWishlist(1, 'card1')).rejects.toThrow(
      'Utilisateur non trouvé'
    );
  });

  it('should throw when card not found', async () => {
    mockUserRepo.findOne.mockResolvedValue({ id: 1 });
    mockPokemonCardRepo.findOne.mockResolvedValue(null);

    await expect(service.addToWishlist(1, 'missing')).rejects.toThrow(
      'Carte Pokémon non trouvée'
    );
  });

  it('should add to favorites', async () => {
    const user = { id: 1 };
    const card = { id: 'card1' };
    const favorites = { id: 'f', items: [] };
    const defaultState = { id: 3, code: 'NM' };

    mockUserRepo.findOne.mockResolvedValue(user);
    mockPokemonCardRepo.findOne.mockResolvedValue(card);
    mockCollectionRepo.findOne.mockResolvedValue(favorites);
    mockCardStateRepo.findOne.mockResolvedValue(defaultState);
    mockCollectionItemRepo.create.mockReturnValue({ id: 8 });
    mockCollectionItemRepo.save.mockResolvedValue({ id: 8 });

    await expect(service.addToFavorites(1, 'card1')).resolves.toEqual({
      id: 8
    });
  });

  it('should throw when favorites collection missing', async () => {
    mockUserRepo.findOne.mockResolvedValue({ id: 1 });
    mockPokemonCardRepo.findOne.mockResolvedValue({ id: 'c' });
    mockCollectionRepo.findOne.mockResolvedValue(null);

    await expect(service.addToFavorites(1, 'c')).rejects.toThrow(
      'Collection Favorites non trouvée. Vérifiez que les collections par défaut sont créées.'
    );
  });

  it('should increment favorites quantity when item exists', async () => {
    const user = { id: 1 };
    const card = { id: 'card1' };
    const item = { id: 12, quantity: 1, pokemonCard: card };
    const favorites = { id: 'f', items: [item] };

    mockUserRepo.findOne.mockResolvedValue(user);
    mockPokemonCardRepo.findOne.mockResolvedValue(card);
    mockCollectionRepo.findOne.mockResolvedValue(favorites);
    mockCollectionItemRepo.save.mockImplementation(async (i) => i);

    const result = await service.addToFavorites(1, 'card1');
    expect(result.quantity).toBe(2);
  });

  it('should add to collection', async () => {
    const collection = { id: 'c', items: [] };
    const card = { id: 'card1' };
    const defaultState = { id: 4, code: 'NM' };

    mockCollectionRepo.findOne.mockResolvedValue(collection);
    mockPokemonCardRepo.findOne.mockResolvedValue(card);
    mockCardStateRepo.findOne.mockResolvedValue(defaultState);
    mockCollectionItemRepo.create.mockReturnValue({ id: 9 });
    mockCollectionItemRepo.save.mockResolvedValue({ id: 9 });

    await expect(service.addToCollection('c', 'card1')).resolves.toEqual({
      id: 9
    });
  });

  it('should increment quantity when item already in collection', async () => {
    const card = { id: 'card1' };
    const item = { id: 20, quantity: 1, pokemonCard: card };
    const collection = { id: 'c', items: [item] };

    mockCollectionRepo.findOne.mockResolvedValue(collection);
    mockPokemonCardRepo.findOne.mockResolvedValue(card);
    mockCollectionItemRepo.save.mockImplementation(async (i) => i);

    const result = await service.addToCollection('c', 'card1');
    expect(result.quantity).toBe(2);
  });

  it('should throw when collection missing', async () => {
    mockCollectionRepo.findOne.mockResolvedValue(null);
    await expect(service.addToCollection('missing', 'card1')).rejects.toThrow(
      'Collection non trouvée'
    );
  });

  it('should throw when default card state missing', async () => {
    mockCollectionRepo.findOne.mockResolvedValue({ id: 'c', items: [] });
    mockPokemonCardRepo.findOne.mockResolvedValue({ id: 'card1' });
    mockCardStateRepo.findOne.mockResolvedValue(null);

    await expect(service.addToCollection('c', 'card1')).rejects.toThrow(
      "CardState NM non trouvé. Veuillez d'abord seed les CardState."
    );
  });

  it('should throw when card not found for collection', async () => {
    mockCollectionRepo.findOne.mockResolvedValue({ id: 'c', items: [] });
    mockPokemonCardRepo.findOne.mockResolvedValue(null);

    await expect(service.addToCollection('c', 'missing')).rejects.toThrow(
      'Carte Pokémon non trouvée'
    );
  });
});
