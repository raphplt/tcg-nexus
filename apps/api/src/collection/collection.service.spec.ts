import { Test, TestingModule } from '@nestjs/testing';
import { CollectionService } from './collection.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from '../collection-item/entities/collection-item.entity';

describe('CollectionService', () => {
  let service: CollectionService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn()
  };

  const mockCollectionItemRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn()
    }))
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionService,
        {
          provide: getRepositoryToken(Collection),
          useValue: mockRepository
        },
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: mockCollectionItemRepository
        }
      ]
    }).compile();

    service = module.get<CollectionService>(CollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
