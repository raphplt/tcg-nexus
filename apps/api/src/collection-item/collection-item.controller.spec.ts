import { Test, TestingModule } from '@nestjs/testing';
import { CollectionItemController } from './collection-item.controller';
import { CollectionItemService } from './collection-item.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CollectionItem } from './entities/collection-item.entity';
import { Collection } from '../collection/entities/collection.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { User } from '../user/entities/user.entity';
import { CardState } from '../card-state/entities/card-state.entity';

describe('CollectionItemController', () => {
  let controller: CollectionItemController;

  const mockCollectionItemService = {
    addToWishlist: jest.fn(),
    addToFavorites: jest.fn(),
    addToCollection: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollectionItemController],
      providers: [
        {
          provide: CollectionItemService,
          useValue: mockCollectionItemService
        },
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: {}
        },
        {
          provide: getRepositoryToken(Collection),
          useValue: {}
        },
        {
          provide: getRepositoryToken(PokemonCard),
          useValue: {}
        },
        {
          provide: getRepositoryToken(User),
          useValue: {}
        },
        {
          provide: getRepositoryToken(CardState),
          useValue: {}
        }
      ]
    }).compile();

    controller = module.get<CollectionItemController>(CollectionItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
