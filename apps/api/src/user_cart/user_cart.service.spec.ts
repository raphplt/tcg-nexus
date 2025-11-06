import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCartService } from './user_cart.service';
import { UserCart } from './entities/user_cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Listing } from 'src/marketplace/entities/listing.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { User } from 'src/user/entities/user.entity';

describe('UserCartService', () => {
  let service: UserCartService;
  let userCartRepo: jest.Mocked<Repository<UserCart>>;
  let cartItemRepo: jest.Mocked<Repository<CartItem>>;
  let listingRepo: jest.Mocked<Repository<Listing>>;

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

  const mockListing: Listing = {
    id: 1,
    seller: { id: 2 } as User,
    pokemonCard: {} as any,
    price: 10.5,
    quantityAvailable: 5,
    currency: 'EUR' as any,
    cardState: 'MINT' as any
  } as Listing;

  const mockCartItem: CartItem = {
    id: 1,
    cart: mockCart,
    listing: mockListing,
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  } as CartItem;

  beforeEach(async () => {
    const userCartRepoMock: Partial<jest.Mocked<Repository<UserCart>>> = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn()
    };

    const cartItemRepoMock: Partial<jest.Mocked<Repository<CartItem>>> = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn()
    };

    const listingRepoMock: Partial<jest.Mocked<Repository<Listing>>> = {
      findOne: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCartService,
        {
          provide: getRepositoryToken(UserCart),
          useValue: userCartRepoMock
        },
        {
          provide: getRepositoryToken(CartItem),
          useValue: cartItemRepoMock
        },
        {
          provide: getRepositoryToken(Listing),
          useValue: listingRepoMock
        }
      ]
    }).compile();

    service = module.get<UserCartService>(UserCartService);
    userCartRepo = module.get(getRepositoryToken(UserCart));
    cartItemRepo = module.get(getRepositoryToken(CartItem));
    listingRepo = module.get(getRepositoryToken(Listing));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateCart', () => {
    it('should return existing cart if found', async () => {
      userCartRepo.findOne.mockResolvedValue(mockCart);

      const result = await service.findOrCreateCart(1);

      expect(result).toEqual(mockCart);
      expect(userCartRepo.findOne).toHaveBeenCalledWith({
        where: { user: { id: 1 } },
        relations: ['user']
      });
    });

    it('should create new cart if not found', async () => {
      userCartRepo.findOne.mockResolvedValue(null);
      userCartRepo.create.mockReturnValue(mockCart);
      userCartRepo.save.mockResolvedValue(mockCart);

      const result = await service.findOrCreateCart(1);

      expect(result).toEqual(mockCart);
      expect(userCartRepo.create).toHaveBeenCalledWith({
        user: { id: 1 }
      });
      expect(userCartRepo.save).toHaveBeenCalled();
    });
  });

  describe('findCartByUserId', () => {
    it('should return cart with items', async () => {
      const cartWithItems = {
        ...mockCart,
        cartItems: [mockCartItem]
      };
      userCartRepo.findOne.mockResolvedValue(cartWithItems);

      const result = await service.findCartByUserId(1);

      expect(result).toEqual(cartWithItems);
      expect(userCartRepo.findOne).toHaveBeenCalledWith({
        where: { user: { id: 1 } },
        relations: [
          'user',
          'cartItems',
          'cartItems.listing',
          'cartItems.listing.pokemonCard'
        ]
      });
    });

    it('should create cart if not found', async () => {
      userCartRepo.findOne.mockResolvedValue(null);
      userCartRepo.create.mockReturnValue(mockCart);
      userCartRepo.save.mockResolvedValue(mockCart);

      const result = await service.findCartByUserId(1);

      expect(result).toEqual(mockCart);
    });
  });

  describe('findOne', () => {
    it('should return cart if found', async () => {
      userCartRepo.findOne.mockResolvedValue(mockCart);

      const result = await service.findOne(1);

      expect(result).toEqual(mockCart);
    });

    it('should return cart if found without userId check', async () => {
      userCartRepo.findOne.mockResolvedValue(mockCart);

      const result = await service.findOne(1);

      expect(result).toEqual(mockCart);
    });

    it('should return cart if user owns it', async () => {
      userCartRepo.findOne.mockResolvedValue(mockCart);

      const result = await service.findOne(1, 1);

      expect(result).toEqual(mockCart);
    });

    it('should throw BadRequestException if user does not own cart', async () => {
      userCartRepo.findOne.mockResolvedValue(mockCart);

      await expect(service.findOne(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if cart not found', async () => {
      userCartRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addItemToCart', () => {
    const createDto: CreateCartItemDto = {
      listingId: 1,
      quantity: 2
    };

    it('should add new item to cart', async () => {
      listingRepo.findOne.mockResolvedValue(mockListing);
      userCartRepo.findOne.mockResolvedValue(mockCart);
      cartItemRepo.findOne.mockResolvedValue(null);
      cartItemRepo.create.mockReturnValue(mockCartItem);
      cartItemRepo.save.mockResolvedValue(mockCartItem);

      const result = await service.addItemToCart(1, createDto);

      expect(result).toEqual(mockCartItem);
      expect(cartItemRepo.create).toHaveBeenCalled();
      expect(cartItemRepo.save).toHaveBeenCalled();
    });

    it('should update quantity if item already exists', async () => {
      const existingItem = { ...mockCartItem, quantity: 1 };
      listingRepo.findOne.mockResolvedValue(mockListing);
      userCartRepo.findOne.mockResolvedValue(mockCart);
      cartItemRepo.findOne.mockResolvedValue(existingItem);
      cartItemRepo.save.mockResolvedValue({
        ...existingItem,
        quantity: 3
      });

      const result = await service.addItemToCart(1, createDto);

      expect(result.quantity).toBe(3);
      expect(cartItemRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if listing not found', async () => {
      listingRepo.findOne.mockResolvedValue(null);

      await expect(service.addItemToCart(1, createDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if user tries to add own listing', async () => {
      const ownListing = { ...mockListing, seller: { id: 1 } as User };
      listingRepo.findOne.mockResolvedValue(ownListing);

      await expect(service.addItemToCart(1, createDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if not enough quantity', async () => {
      const lowStockListing = { ...mockListing, quantityAvailable: 1 };
      listingRepo.findOne.mockResolvedValue(lowStockListing);
      userCartRepo.findOne.mockResolvedValue(mockCart);
      cartItemRepo.findOne.mockResolvedValue(null);

      await expect(service.addItemToCart(1, createDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('updateCartItem', () => {
    const updateDto: UpdateCartItemDto = {
      quantity: 3
    };

    it('should update cart item quantity', async () => {
      const cartItemWithCart = {
        ...mockCartItem,
        cart: { ...mockCart, user: mockUser }
      };
      cartItemRepo.findOne.mockResolvedValue(cartItemWithCart);
      cartItemRepo.save.mockResolvedValue({
        ...cartItemWithCart,
        quantity: 3
      });

      const result = await service.updateCartItem(1, 1, updateDto);

      expect(result.quantity).toBe(3);
      expect(cartItemRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if cart item not found', async () => {
      cartItemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateCartItem(1, 1, updateDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user does not own cart', async () => {
      const otherUserCart = {
        ...mockCart,
        user: { id: 2 } as User
      };
      const cartItemWithOtherCart = {
        ...mockCartItem,
        cart: otherUserCart
      };
      cartItemRepo.findOne.mockResolvedValue(cartItemWithOtherCart);

      await expect(
        service.updateCartItem(1, 1, updateDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if not enough quantity', async () => {
      const lowStockListing = { ...mockListing, quantityAvailable: 2 };
      const cartItemWithCart = {
        ...mockCartItem,
        cart: { ...mockCart, user: mockUser },
        listing: lowStockListing
      };
      cartItemRepo.findOne.mockResolvedValue(cartItemWithCart);

      await expect(
        service.updateCartItem(1, 1, updateDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItemFromCart', () => {
    it('should remove cart item', async () => {
      const cartItemWithCart = {
        ...mockCartItem,
        cart: { ...mockCart, user: mockUser }
      };
      cartItemRepo.findOne.mockResolvedValue(cartItemWithCart);
      cartItemRepo.remove.mockResolvedValue(cartItemWithCart);

      await service.removeItemFromCart(1, 1);

      expect(cartItemRepo.remove).toHaveBeenCalledWith(cartItemWithCart);
    });

    it('should throw NotFoundException if cart item not found', async () => {
      cartItemRepo.findOne.mockResolvedValue(null);

      await expect(service.removeItemFromCart(1, 1)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if user does not own cart', async () => {
      const otherUserCart = {
        ...mockCart,
        user: { id: 2 } as User
      };
      const cartItemWithOtherCart = {
        ...mockCartItem,
        cart: otherUserCart
      };
      cartItemRepo.findOne.mockResolvedValue(cartItemWithOtherCart);

      await expect(service.removeItemFromCart(1, 1)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', async () => {
      const cartWithItems = {
        ...mockCart,
        cartItems: [mockCartItem]
      };
      userCartRepo.findOne.mockResolvedValue(cartWithItems);
      cartItemRepo.remove.mockResolvedValue([mockCartItem] as any);

      await service.clearCart(1);

      expect(cartItemRepo.remove).toHaveBeenCalledWith([mockCartItem]);
    });

    it('should do nothing if cart does not exist', async () => {
      userCartRepo.findOne.mockResolvedValue(null);

      await service.clearCart(1);

      expect(cartItemRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove cart', async () => {
      userCartRepo.findOne.mockResolvedValue(mockCart);
      userCartRepo.remove.mockResolvedValue(mockCart);

      await service.remove(1, 1);

      expect(userCartRepo.remove).toHaveBeenCalledWith(mockCart);
    });

    it('should throw NotFoundException if cart not found', async () => {
      userCartRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user does not own cart', async () => {
      userCartRepo.findOne.mockResolvedValue(mockCart);

      await expect(service.remove(1, 2)).rejects.toThrow(BadRequestException);
    });
  });
});
