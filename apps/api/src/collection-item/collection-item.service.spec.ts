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
});
