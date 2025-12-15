import { Test, TestingModule } from '@nestjs/testing';
import { ListingsController } from './listings.controller';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto } from './dto/create-marketplace.dto';
import { UpdateListingDto } from './dto/update-marketplace.dto';

describe('ListingsController', () => {
  let controller: ListingsController;
  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findBySellerId: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListingsController],
      providers: [
        {
          provide: MarketplaceService,
          useValue: mockService
        }
      ]
    }).compile();

    controller = module.get<ListingsController>(ListingsController);
    jest.clearAllMocks();
  });

  it('should create listing', async () => {
    const dto = { pokemonCardId: 'id', price: 10 } as CreateListingDto;
    mockService.create.mockResolvedValue({ id: 1 });
    await expect(
      controller.createListing(dto, { id: 2 } as any)
    ).resolves.toEqual({ id: 1 });
  });

  it('should get all listings', async () => {
    mockService.findAll.mockResolvedValue({ data: [] });
    await expect(controller.getAllListings({} as any)).resolves.toEqual({
      data: []
    });
  });

  it('should get my listings', async () => {
    mockService.findBySellerId.mockResolvedValue([{ id: 1 }]);
    await expect(
      controller.getMyListings({ id: 5 } as any, {} as any)
    ).resolves.toEqual([{ id: 1 }]);
  });

  it('should get listing by id', async () => {
    mockService.findOne.mockResolvedValue({ id: 3 });
    await expect(controller.getListingById('3')).resolves.toEqual({ id: 3 });
  });

  it('should update listing', async () => {
    const dto = { price: 20 } as UpdateListingDto;
    mockService.update.mockResolvedValue({ id: 4 });
    await expect(
      controller.updateListing('4', dto, { id: 1 } as any)
    ).resolves.toEqual({
      id: 4
    });
  });

  it('should delete listing', async () => {
    mockService.delete.mockResolvedValue(undefined);
    await controller.deleteListing('6', { id: 1 } as any);
    expect(mockService.delete).toHaveBeenCalledWith(6, { id: 1 });
  });
});
