import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto } from './dto/create-marketplace.dto';
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

  describe('updateListing', () => {
    it('should update listing', async () => {
      const dto = { price: 20 };
      const user = { id: 1 } as User;
      mockMarketplaceService.update.mockResolvedValue({ id: 1, ...dto });

      const result = await controller.updateListing('1', dto as any, user);

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
});
