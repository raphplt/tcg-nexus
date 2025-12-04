import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceService } from './marketplace.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Listing } from './entities/listing.entity';
import { PriceHistory } from './entities/price-history.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { Order, OrderStatus } from './entities/order.entity';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../common/enums/user';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { OrderItem } from './entities/order-item.entity';
import { StripeService } from './stripe.service';
import { UserCartService } from '../user_cart/user_cart.service';
import { CreateOrderDto } from './dto/create-order.dto';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let listingRepo: any;
  let orderRepo: any;
  let userCartService: any;

  const mockListingRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getMany: jest.fn().mockResolvedValue([]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([])
    }))
  };

  const mockPriceHistoryRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn()
  };

  const mockPokemonCardRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0])
    }))
  };

  const mockOrderQb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0])
  };

  const mockOrderRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => mockOrderQb)
  };

  const mockPaymentTransactionRepo = {
    create: jest.fn(),
    save: jest.fn()
  };

  const mockOrderItemRepo = {
    create: jest.fn(),
    save: jest.fn()
  };

  const mockStripeService = {
    retrievePaymentIntent: jest.fn()
  };

  const mockUserCartService = {
    findCartByUserId: jest.fn(),
    clearCart: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: getRepositoryToken(Listing), useValue: mockListingRepo },
        {
          provide: getRepositoryToken(PriceHistory),
          useValue: mockPriceHistoryRepo
        },
        {
          provide: getRepositoryToken(PokemonCard),
          useValue: mockPokemonCardRepo
        },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        {
          provide: getRepositoryToken(PaymentTransaction),
          useValue: mockPaymentTransactionRepo
        },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepo },
        { provide: StripeService, useValue: mockStripeService },
        { provide: UserCartService, useValue: mockUserCartService }
      ]
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
    listingRepo = module.get(getRepositoryToken(Listing));
    orderRepo = module.get(getRepositoryToken(Order));
    userCartService = module.get(UserCartService);

    // Reset mocks but re-establish chainable behavior for mockOrderQb
    jest.clearAllMocks();

    // Re-configure mockOrderQb chainable methods after clearAllMocks
    mockOrderQb.leftJoinAndSelect.mockReturnThis();
    mockOrderQb.leftJoin.mockReturnThis();
    mockOrderQb.select.mockReturnThis();
    mockOrderQb.addSelect.mockReturnThis();
    mockOrderQb.where.mockReturnThis();
    mockOrderQb.andWhere.mockReturnThis();
    mockOrderQb.groupBy.mockReturnThis();
    mockOrderQb.addGroupBy.mockReturnThis();
    mockOrderQb.orderBy.mockReturnThis();
    mockOrderQb.skip.mockReturnThis();
    mockOrderQb.take.mockReturnThis();
    mockOrderQb.limit.mockReturnThis();
    mockOrderQb.getRawMany.mockResolvedValue([]);
    mockOrderQb.getMany.mockResolvedValue([]);
    mockOrderQb.getManyAndCount.mockResolvedValue([[], 0]);
    mockOrderRepo.createQueryBuilder.mockReturnValue(mockOrderQb);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const user = { id: 1 } as User;
    const dto: CreateOrderDto = {
      paymentIntentId: 'pi_123',
      shippingAddress: '123 Main St'
    };

    it('should create an order successfully', async () => {
      const cart = {
        cartItems: [
          {
            listing: { id: 1, price: 10, quantityAvailable: 5 },
            quantity: 2
          }
        ]
      };
      userCartService.findCartByUserId.mockResolvedValue(cart);
      orderRepo.create.mockReturnValue({});
      orderRepo.save.mockResolvedValue({ id: 1 });

      const result = await service.createOrder(dto, user);

      expect(result).toEqual({ id: 1 });
      expect(orderRepo.save).toHaveBeenCalled();
      expect(userCartService.clearCart).toHaveBeenCalledWith(user.id);
    });

    it('should throw BadRequestException if cart is empty', async () => {
      userCartService.findCartByUserId.mockResolvedValue({ cartItems: [] });
      await expect(service.createOrder(dto, user)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if insufficient quantity', async () => {
      const cart = {
        cartItems: [
          {
            listing: { id: 1, price: 10, quantityAvailable: 1 },
            quantity: 2
          }
        ]
      };
      userCartService.findCartByUserId.mockResolvedValue(cart);
      await expect(service.createOrder(dto, user)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('update ownership', () => {
    const owner: User = { id: 1, role: UserRole.USER } as any;
    const other: User = { id: 2, role: UserRole.USER } as any;
    const admin: User = { id: 3, role: UserRole.ADMIN } as any;
    const listing: Partial<Listing> = { id: 10, seller: { id: 1 } as any };

    it('throws NotFound if listing missing', async () => {
      listingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update(10, { price: 100 } as any, owner)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids non-owner non-admin', async () => {
      listingRepo.findOne.mockResolvedValue(listing);
      await expect(
        service.update(10, { price: 100 } as any, other)
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows owner', async () => {
      listingRepo.findOne.mockResolvedValue({ ...listing });
      listingRepo.save.mockImplementation(async (l: Listing) => l);
      const res = await service.update(10, { price: 200 } as any, owner);
      expect(res).toBeDefined();
      expect(listingRepo.save).toHaveBeenCalled();
    });

    it('allows admin', async () => {
      listingRepo.findOne.mockResolvedValue({ ...listing });
      listingRepo.save.mockImplementation(async (l: Listing) => l);
      const res = await service.update(10, { price: 300 } as any, admin);
      expect(res).toBeDefined();
      expect(listingRepo.save).toHaveBeenCalled();
    });
  });

  describe('delete ownership', () => {
    const owner: User = { id: 1, role: UserRole.USER } as any;
    const other: User = { id: 2, role: UserRole.USER } as any;
    const admin: User = { id: 3, role: UserRole.ADMIN } as any;
    const listing: Partial<Listing> = { id: 10, seller: { id: 1 } as any };

    it('throws NotFound if listing missing', async () => {
      listingRepo.findOne.mockResolvedValue(null);
      await expect(service.delete(10, owner)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('forbids non-owner non-admin', async () => {
      listingRepo.findOne.mockResolvedValue(listing);
      await expect(service.delete(10, other)).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it('allows owner', async () => {
      listingRepo.findOne.mockResolvedValue({ ...listing });
      await service.delete(10, owner);
      expect(listingRepo.delete).toHaveBeenCalledWith(10);
    });

    it('allows admin', async () => {
      listingRepo.findOne.mockResolvedValue({ ...listing });
      await service.delete(10, admin);
      expect(listingRepo.delete).toHaveBeenCalledWith(10);
    });
  });

  describe('admin orders', () => {
    it('paginates and filters orders for admin dashboard', async () => {
      const qb = orderRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[{ id: 1 }], 1]);

      const result = await service.findAllOrders({
        page: 2,
        limit: 5,
        status: OrderStatus.PAID,
        buyerId: 12,
        sellerId: 9
      });

      expect(qb.andWhere).toHaveBeenCalledWith('order.status = :status', {
        status: OrderStatus.PAID
      });
      expect(qb.andWhere).toHaveBeenCalledWith('buyer.id = :buyerId', {
        buyerId: 12
      });
      expect(qb.andWhere).toHaveBeenCalledWith('seller.id = :sellerId', {
        sellerId: 9
      });
      expect(result.meta.currentPage).toBe(2);
      expect(result.data).toHaveLength(1);
    });

    it('returns detailed order for admins', async () => {
      const order = { id: 7, status: OrderStatus.PAID };
      orderRepo.findOne.mockResolvedValue(order);

      const result = await service.findOrderByIdAsAdmin(7);

      expect(result).toBe(order);
      expect(orderRepo.findOne).toHaveBeenCalledWith({
        where: { id: 7 },
        relations: [
          'buyer',
          'orderItems',
          'orderItems.listing',
          'orderItems.listing.seller',
          'orderItems.listing.pokemonCard',
          'payments'
        ]
      });
    });

    it('updates order status via admin path', async () => {
      const order = { id: 5, status: OrderStatus.PENDING };
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockResolvedValue({
        ...order,
        status: OrderStatus.SHIPPED
      });

      const result = await service.updateOrderStatus(5, OrderStatus.SHIPPED);

      expect(result.status).toBe(OrderStatus.SHIPPED);
      expect(orderRepo.save).toHaveBeenCalledWith({
        ...order,
        status: OrderStatus.SHIPPED
      });
    });
  });
});
