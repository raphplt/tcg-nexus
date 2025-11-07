import { Test, TestingModule } from '@nestjs/testing';
import { UserCartController } from './user_cart.controller';
import { UserCartService } from './user_cart.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { User } from '../user/entities/user.entity';
import { UserCart } from './entities/user_cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

describe('UserCartController', () => {
  let controller: UserCartController;
  let service: jest.Mocked<UserCartService>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  } as User;

  const mockCart: UserCart = {
    id: 1,
    user: mockUser,
    cartItems: [],
    createdAt: new Date(),
    updatedAt: new Date()
  } as UserCart;

  const mockCartItem: CartItem = {
    id: 1,
    cart: mockCart,
    listing: {} as any,
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  } as CartItem;

  beforeEach(async () => {
    const serviceMock: Partial<jest.Mocked<UserCartService>> = {
      findCartByUserId: jest.fn(),
      findOne: jest.fn(),
      addItemToCart: jest.fn(),
      updateCartItem: jest.fn(),
      removeItemFromCart: jest.fn(),
      clearCart: jest.fn(),
      remove: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserCartController],
      providers: [
        {
          provide: UserCartService,
          useValue: serviceMock
        }
      ]
    }).compile();

    controller = module.get<UserCartController>(UserCartController);
    service = module.get(UserCartService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyCart', () => {
    it('should return user cart', async () => {
      service.findCartByUserId.mockResolvedValue(mockCart);

      const result = await controller.getMyCart(mockUser);

      expect(result).toEqual(mockCart);
      expect(jest.mocked(service.findCartByUserId)).toHaveBeenCalledWith(
        mockUser.id
      );
    });
  });

  describe('findOne', () => {
    it('should return cart by id', async () => {
      service.findOne.mockResolvedValue(mockCart);

      const result = await controller.findOne(1, mockUser);

      expect(result).toEqual(mockCart);
      expect(jest.mocked(service.findOne)).toHaveBeenCalledWith(1, mockUser.id);
    });

    it('should throw NotFoundException if cart not found', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Cart not found')
      );

      await expect(controller.findOne(1, mockUser)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('addItemToCart', () => {
    const createDto: CreateCartItemDto = {
      listingId: 1,
      quantity: 2
    };

    it('should add item to cart', async () => {
      service.addItemToCart.mockResolvedValue(mockCartItem);

      const result = await controller.addItemToCart(mockUser, createDto);

      expect(result).toEqual(mockCartItem);
      expect(jest.mocked(service.addItemToCart)).toHaveBeenCalledWith(
        mockUser.id,
        createDto
      );
    });

    it('should throw BadRequestException if invalid data', async () => {
      service.addItemToCart.mockRejectedValue(
        new BadRequestException('Invalid data')
      );

      await expect(
        controller.addItemToCart(mockUser, createDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if listing not found', async () => {
      service.addItemToCart.mockRejectedValue(
        new NotFoundException('Listing not found')
      );

      await expect(
        controller.addItemToCart(mockUser, createDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCartItem', () => {
    const updateDto: UpdateCartItemDto = {
      quantity: 3
    };

    it('should update cart item', async () => {
      const updatedItem = { ...mockCartItem, quantity: 3 };
      service.updateCartItem.mockResolvedValue(updatedItem);

      const result = await controller.updateCartItem(mockUser, 1, updateDto);

      expect(result).toEqual(updatedItem);
      expect(jest.mocked(service.updateCartItem)).toHaveBeenCalledWith(
        mockUser.id,
        1,
        updateDto
      );
    });

    it('should throw NotFoundException if cart item not found', async () => {
      service.updateCartItem.mockRejectedValue(
        new NotFoundException('Cart item not found')
      );

      await expect(
        controller.updateCartItem(mockUser, 1, updateDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItemFromCart', () => {
    it('should remove item from cart', async () => {
      service.removeItemFromCart.mockResolvedValue(undefined);

      await controller.removeItemFromCart(mockUser, 1);

      expect(jest.mocked(service.removeItemFromCart)).toHaveBeenCalledWith(
        mockUser.id,
        1
      );
    });

    it('should throw NotFoundException if cart item not found', async () => {
      service.removeItemFromCart.mockRejectedValue(
        new NotFoundException('Cart item not found')
      );

      await expect(controller.removeItemFromCart(mockUser, 1)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('clearCart', () => {
    it('should clear user cart', async () => {
      service.clearCart.mockResolvedValue(undefined);

      await controller.clearCart(mockUser);

      expect(jest.mocked(service.clearCart)).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('remove', () => {
    it('should remove cart', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(1, mockUser);

      expect(jest.mocked(service.remove)).toHaveBeenCalledWith(1, mockUser.id);
    });

    it('should throw NotFoundException if cart not found', async () => {
      service.remove.mockRejectedValue(new NotFoundException('Cart not found'));

      await expect(controller.remove(1, mockUser)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
