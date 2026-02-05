import { Test, TestingModule } from '@nestjs/testing';
import { CollectionItemController } from './collection-item.controller';
import { CollectionItemService } from './collection-item.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CollectionItem } from './entities/collection-item.entity';
import { Collection } from '../collection/entities/collection.entity';
import { Card } from '../card/entities/card.entity';
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
          provide: getRepositoryToken(Card),
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

  it('should add to wishlist', async () => {
    mockCollectionItemService.addToWishlist.mockResolvedValue({ id: 1 });
    await expect(controller.addToWishlist('1', 'card')).resolves.toEqual({
      id: 1
    });
    expect(mockCollectionItemService.addToWishlist).toHaveBeenCalledWith(
      '1',
      'card'
    );
  });

  it('should add to favorites', async () => {
    mockCollectionItemService.addToFavorites.mockResolvedValue({ id: 2 });
    await expect(controller.addToFavorites('2', 'card2')).resolves.toEqual({
      id: 2
    });
  });

  it('should add to collection', async () => {
    mockCollectionItemService.addToCollection.mockResolvedValue({ id: 3 });
    await expect(controller.addToCollection('col', 'card3')).resolves.toEqual({
      id: 3
    });
  });
});
