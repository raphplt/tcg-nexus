import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto } from './dto/create-marketplace.dto';
import { UpdateListingDto } from './dto/update-marketplace.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { User } from '../user/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';

describe('MarketplaceController', () => {
  let controller: MarketplaceController;
  let service: MarketplaceService;

  const mockMarketplaceService = {
    create: jest.fn(),
    createOrder: jest.fn(),
    findOrdersByBuyerId: jest.fn(),
    findOrderById: jest.fn(),
    findAllOrders: jest.fn(),
    findOrderByIdAsAdmin: jest.fn(),
    updateOrderStatus: jest.fn(),
    findAll: jest.fn(),
    findBySellerId: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getCardsWithMarketplaceData: jest.fn(),
    getCardStatistics: jest.fn(),
    getBestSellers: jest.fn(),
    getSellerStatistics: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketplaceController],
      providers: [
        { provide: MarketplaceService, useValue: mockMarketplaceService },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) }
        },
        {
          provide: RolesGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) }
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() }
        }
      ]
    }).compile();

    controller = module.get<MarketplaceController>(MarketplaceController);
    service = module.get<MarketplaceService>(MarketplaceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createListing', () => {
    it('should create a listing', async () => {
      const dto: CreateListingDto = {
        pokemonCardId: 'xy1-1',
        price: 10,
        currency: 'USD' as any,
        cardState: 'NM' as any,
        quantityAvailable: 1
      };
      const user = { id: 1 } as User;
      mockMarketplaceService.create.mockResolvedValue({ id: 1, ...dto });

      const result = await controller.createListing(dto, user);

      expect(result).toEqual({ id: 1, ...dto });
      expect(service.create).toHaveBeenCalledWith(dto, user);
    });
  });

  describe('createOrder', () => {
    it('should create an order', async () => {
      const dto: CreateOrderDto = {
        paymentIntentId: 'pi_123',
        shippingAddress: '123 Main St'
      };
      const user = { id: 1 } as User;
      mockMarketplaceService.createOrder.mockResolvedValue({ id: 1 });

      const result = await controller.createOrder(dto, user);

      expect(result).toEqual({ id: 1 });
      expect(service.createOrder).toHaveBeenCalledWith(dto, user);
    });
  });

  describe('getMyOrders', () => {
    it('should return user orders', async () => {
      const user = { id: 1 } as User;
      mockMarketplaceService.findOrdersByBuyerId.mockResolvedValue([]);

      const result = await controller.getMyOrders(user);

      expect(result).toEqual([]);
      expect(service.findOrdersByBuyerId).toHaveBeenCalledWith(user.id);
    });
  });

  it('should get order by id', async () => {
    mockMarketplaceService.findOrderById.mockResolvedValue({ id: 2 });
    await expect(
      controller.getOrderById('2', { id: 1 } as any)
    ).resolves.toEqual({
      id: 2
    });
  });

  it('should get all orders as admin', async () => {
    mockMarketplaceService.findAllOrders.mockResolvedValue({ data: [] });
    await expect(controller.getAllOrders({} as any)).resolves.toEqual({
      data: []
    });
  });

  it('should get order as admin by id', async () => {
    mockMarketplaceService.findOrderByIdAsAdmin.mockResolvedValue({ id: 5 });
    await expect(controller.getOrderAsAdmin(5)).resolves.toEqual({ id: 5 });
  });

  it('should update order status', async () => {
    mockMarketplaceService.updateOrderStatus.mockResolvedValue({
      id: 7,
      status: 'PAID'
    });
    await expect(
      controller.updateOrderStatus(7, { status: 'PAID' } as any)
    ).resolves.toEqual({ id: 7, status: 'PAID' });
  });

  describe('getAllListings', () => {
    it('should return all listings', async () => {
      const query = { page: 1, limit: 10 };
      mockMarketplaceService.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0 }
      });

      const result = await controller.getAllListings(query);

      expect(result).toEqual({ data: [], meta: { total: 0 } });
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  it('should get my listings', async () => {
    mockMarketplaceService.findBySellerId.mockResolvedValue([{ id: 1 }]);
    await expect(controller.getMyListings({ id: 4 } as any)).resolves.toEqual([
      { id: 1 }
    ]);
  });

  it('should get listing by id', async () => {
    mockMarketplaceService.findOne.mockResolvedValue({ id: 3 });
    await expect(controller.getListingById('3')).resolves.toEqual({ id: 3 });
  });

  describe('updateListing', () => {
    it('should update listing', async () => {
      const dto: UpdateListingDto = { price: 20 };
      const user = { id: 1 } as User;
      mockMarketplaceService.update.mockResolvedValue({ id: 1, ...dto });

      const result = await controller.updateListing('1', dto, user);

      expect(result).toEqual({ id: 1, ...dto });
      expect(service.update).toHaveBeenCalledWith(1, dto, user);
    });
  });

  describe('deleteListing', () => {
    it('should delete listing', async () => {
      const user = { id: 1 } as User;
      mockMarketplaceService.delete.mockResolvedValue(undefined);

      await controller.deleteListing('1', user);

      expect(service.delete).toHaveBeenCalledWith(1, user);
    });
  });

  it('should get cards with marketplace data', async () => {
    mockMarketplaceService.getCardsWithMarketplaceData.mockResolvedValue([]);
    await expect(
      controller.getCardsWithMarketplaceData({ search: 'pikachu' })
    ).resolves.toEqual([]);
  });

  it('should get card statistics', async () => {
    mockMarketplaceService.getCardStatistics.mockResolvedValue({ id: 'card' });
    await expect(
      controller.getCardStatistics('card', 'EUR', 'NM')
    ).resolves.toEqual({
      id: 'card'
    });
  });

  it('should get best sellers and seller stats', async () => {
    mockMarketplaceService.getBestSellers.mockResolvedValue([{ id: 1 }]);
    mockMarketplaceService.getSellerStatistics.mockResolvedValue({ id: 2 });
    mockMarketplaceService.findBySellerId.mockResolvedValue([{ id: 3 }]);

    await expect(controller.getBestSellers(5)).resolves.toEqual([{ id: 1 }]);
    await expect(controller.getSellerStatistics(2)).resolves.toEqual({ id: 2 });
    await expect(controller.getSellerListings(9)).resolves.toEqual([{ id: 3 }]);
  });
});
