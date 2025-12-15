import { Test, TestingModule } from '@nestjs/testing';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Collection } from './entities/collection.entity';

describe('CollectionController', () => {
  let controller: CollectionController;

  const mockCollectionService = {
    findAll: jest.fn(),
    findByUserId: jest.fn(),
    findOneById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAllPaginated: jest.fn(),
    findCollectionItemsPaginated: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollectionController],
      providers: [
        {
          provide: CollectionService,
          useValue: mockCollectionService
        },
        {
          provide: getRepositoryToken(Collection),
          useValue: {}
        }
      ]
    }).compile();

    controller = module.get<CollectionController>(CollectionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should find all public collections', async () => {
    mockCollectionService.findAll.mockResolvedValue([{ id: '1' }]);
    await expect(controller.findAll()).resolves.toEqual([{ id: '1' }]);
  });

  it('should return paginated collections', async () => {
    mockCollectionService.findAllPaginated.mockResolvedValue({ total: 1 });
    await expect(
      controller.findAllPaginated(1 as any, 10 as any)
    ).resolves.toEqual({
      total: 1
    });
  });

  it('should find collections by user', async () => {
    mockCollectionService.findByUserId.mockResolvedValue([{ id: 'u' }]);
    await expect(controller.findByUserId('2')).resolves.toEqual([{ id: 'u' }]);
  });

  it('should find collection items with defaults', async () => {
    mockCollectionService.findCollectionItemsPaginated.mockResolvedValue({
      data: []
    });
    await expect(
      controller.findCollectionItems(
        'col',
        undefined,
        undefined,
        's',
        'name',
        'ASC'
      )
    ).resolves.toEqual({ data: [] });
    expect(
      mockCollectionService.findCollectionItemsPaginated
    ).toHaveBeenCalledWith('col', 1, 10, 's', 'name', 'ASC');
  });

  it('should find one collection by id', async () => {
    mockCollectionService.findOneById.mockResolvedValue({ id: '1' });
    await expect(controller.findOneById('1')).resolves.toEqual({ id: '1' });
  });

  it('should create collection with current user', async () => {
    mockCollectionService.create.mockImplementation(async (dto) => dto);
    const dto: any = { name: 'New' };
    const result: any = await controller.create(dto, { id: 3 } as any);
    expect(result.userId).toBe(3);
  });

  it('should update collection', async () => {
    mockCollectionService.update.mockResolvedValue({
      id: '1',
      name: 'Updated'
    });
    await expect(
      controller.update('1', { name: 'Updated' } as any, { id: 3 } as any)
    ).resolves.toEqual({ id: '1', name: 'Updated' });
  });

  it('should delete collection and return message', async () => {
    mockCollectionService.delete.mockResolvedValue(undefined);
    await expect(controller.delete('1', { id: 3 } as any)).resolves.toEqual({
      message: 'Collection supprimée avec succès'
    });
  });

  it('should get collections for current user', async () => {
    mockCollectionService.findByUserId.mockResolvedValue([{ id: 'mine' }]);
    await expect(
      controller.getMyCollections({ id: 5 } as any)
    ).resolves.toEqual([{ id: 'mine' }]);
  });
});
