import { Test, TestingModule } from '@nestjs/testing';
import { CollectionService } from './collection.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Collection } from './entities/collection.entity';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionService,
        {
          provide: getRepositoryToken(Collection),
          useValue: mockRepository
        }
      ]
    }).compile();

    service = module.get<CollectionService>(CollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
