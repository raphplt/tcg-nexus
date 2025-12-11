import { Test, TestingModule } from '@nestjs/testing';
import { CardStateService } from './card-state.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CardState } from './entities/card-state.entity';

describe('CardStateService', () => {
  let service: CardStateService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardStateService,
        {
          provide: getRepositoryToken(CardState),
          useValue: mockRepository
        }
      ]
    }).compile();

    service = module.get<CardStateService>(CardStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create and return card state', async () => {
    const dto = { name: 'Near Mint', code: 'NM' } as any;
    mockRepository.create.mockReturnValue(dto);
    mockRepository.save.mockResolvedValue({ id: 1, ...dto });

    await expect(service.create(dto)).resolves.toEqual({ id: 1, ...dto });
    expect(mockRepository.create).toHaveBeenCalledWith(dto);
  });

  it('should list all card states', async () => {
    mockRepository.find.mockResolvedValue([{ id: 1 }]);
    await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
  });

  it('should return one card state by id', async () => {
    mockRepository.findOne.mockResolvedValue({ id: 2 });
    await expect(service.findOne(2)).resolves.toEqual({ id: 2 });
  });

  it('should throw when card state not found', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(
      'CardState with id 999 not found'
    );
  });

  it('should find by code', async () => {
    mockRepository.findOne.mockResolvedValue({ id: 3, code: 'NM' });
    await expect(service.findByCode('NM' as any)).resolves.toEqual({
      id: 3,
      code: 'NM'
    });
  });

  it('should update then return updated card state', async () => {
    mockRepository.update.mockResolvedValue({ affected: 1 });
    mockRepository.findOne.mockResolvedValue({ id: 4, name: 'Updated' });

    await expect(service.update(4, { name: 'Updated' } as any)).resolves.toEqual(
      { id: 4, name: 'Updated' }
    );
    expect(mockRepository.update).toHaveBeenCalledWith(4, { name: 'Updated' });
  });

  it('should remove card state', async () => {
    mockRepository.delete.mockResolvedValue({ affected: 1 });
    await expect(service.remove(5)).resolves.toBeUndefined();
    expect(mockRepository.delete).toHaveBeenCalledWith(5);
  });
});
