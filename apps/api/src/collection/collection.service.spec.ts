import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { CollectionService } from './collection.service';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from '../collection-item/entities/collection-item.entity';

describe('CollectionService', () => {
  let service: CollectionService;

  const mockCollectionRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn()
  };

  const mockCollectionItemRepo = {
    createQueryBuilder: jest.fn()
  };

  const createQueryBuilder = () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(2),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }])
    };
    return qb;
  };

  beforeEach(async () => {
    mockCollectionItemRepo.createQueryBuilder.mockImplementation(
      createQueryBuilder
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionService,
        {
          provide: getRepositoryToken(Collection),
          useValue: mockCollectionRepo
        },
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: mockCollectionItemRepo
        }
      ]
    }).compile();

    service = module.get<CollectionService>(CollectionService);
    jest.clearAllMocks();
  });

  it('should list public collections', async () => {
    mockCollectionRepo.find.mockResolvedValue([{ id: '1' }]);
    const result = await service.findAll();
    expect(result).toEqual([{ id: '1' }]);
    expect(mockCollectionRepo.find).toHaveBeenCalled();
  });

  it('should find collections by user id', async () => {
    mockCollectionRepo.find.mockResolvedValue([{ id: '1', user: { id: 2 } }]);
    const result = await service.findByUserId('2');
    expect(result[0].user.id).toBe(2);
  });

  it('should find one collection or throw', async () => {
    mockCollectionRepo.findOne.mockResolvedValue({ id: '10' });
    await expect(service.findOneById('10')).resolves.toEqual({ id: '10' });

    mockCollectionRepo.findOne.mockResolvedValue(null);
    await expect(service.findOneById('missing')).rejects.toThrow(
      NotFoundException
    );
  });

  it('should create collection with user relation', async () => {
    const dto = { name: 'Col', description: 'desc', userId: 3 };
    mockCollectionRepo.create.mockReturnValue({ ...dto });
    mockCollectionRepo.save.mockResolvedValue({ id: 'new', ...dto });

    const result = await service.create(dto as any);
    expect(result.id).toBe('new');
    expect(mockCollectionRepo.save).toHaveBeenCalled();
  });

  it('should update collection when owner matches', async () => {
    mockCollectionRepo.findOne.mockResolvedValue({
      id: 'c',
      user: { id: 1 },
      name: 'Old'
    });
    mockCollectionRepo.save.mockResolvedValue({
      id: 'c',
      name: 'New',
      user: { id: 1 }
    });

    const result = await service.update('c', { name: 'New' } as any, 1);
    expect(result.name).toBe('New');
  });

  it('should forbid update when user mismatches', async () => {
    mockCollectionRepo.findOne.mockResolvedValue({
      id: 'c',
      user: { id: 2 }
    });
    await expect(service.update('c', {} as any, 1)).rejects.toThrow(
      ForbiddenException
    );
  });

  it('should throw on update when collection missing', async () => {
    mockCollectionRepo.findOne.mockResolvedValue(null);
    await expect(service.update('missing', {} as any, 1)).rejects.toThrow(
      NotFoundException
    );
  });

  it('should delete when owner matches', async () => {
    mockCollectionRepo.findOne.mockResolvedValue({
      id: 'c',
      user: { id: 1 }
    });
    mockCollectionRepo.delete.mockResolvedValue({ affected: 1 });
    await expect(service.delete('c', 1)).resolves.toBeUndefined();
    expect(mockCollectionRepo.delete).toHaveBeenCalledWith('c');
  });

  it('should forbid delete for other user', async () => {
    mockCollectionRepo.findOne.mockResolvedValue({
      id: 'c',
      user: { id: 2 }
    });
    await expect(service.delete('c', 1)).rejects.toThrow(ForbiddenException);
  });

  it('should throw on delete when missing', async () => {
    mockCollectionRepo.findOne.mockResolvedValue(null);
    await expect(service.delete('missing', 1)).rejects.toThrow(
      NotFoundException
    );
  });

  it('should paginate collections', async () => {
    mockCollectionRepo.findAndCount.mockResolvedValue([[{ id: 'a' }], 3]);
    const result = await service.findAllPaginated(1, 2);
    expect(result.totalPages).toBe(2);
    expect(result.collections).toHaveLength(1);
  });

  it('should paginate collection items with search', async () => {
    mockCollectionRepo.findOne.mockResolvedValue({ id: 'c' });
    const qb = createQueryBuilder();
    mockCollectionItemRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.findCollectionItemsPaginated(
      'c',
      1,
      2,
      'pikachu',
      'invalid',
      'ASC'
    );

    expect(qb.andWhere).toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('item.added_at', 'ASC');
    expect(result.meta.totalItems).toBe(2);
  });

  it('should order by pokemonCard name when requested', async () => {
    mockCollectionRepo.findOne.mockResolvedValue({ id: 'c' });
    const qb = createQueryBuilder();
    mockCollectionItemRepo.createQueryBuilder.mockReturnValue(qb);

    await service.findCollectionItemsPaginated(
      'c',
      1,
      2,
      undefined,
      'pokemonCard.name',
      'DESC'
    );
    expect(qb.orderBy).toHaveBeenCalledWith('pokemonCard.name', 'DESC');
  });

  it('should throw when collection missing on pagination', async () => {
    mockCollectionRepo.findOne.mockResolvedValue(null);
    await expect(
      service.findCollectionItemsPaginated('missing', 1, 10)
    ).rejects.toThrow(NotFoundException);
  });
});
