import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCart } from './entities/user_cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Listing } from 'src/marketplace/entities/listing.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class UserCartService {
  constructor(
    @InjectRepository(UserCart)
    private userCartRepository: Repository<UserCart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>
  ) {}

  /**
   * Crée ou récupère le panier d'un utilisateur
   */
  async findOrCreateCart(userId: number): Promise<UserCart> {
    let cart = await this.userCartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user']
    });

    if (!cart) {
      cart = this.userCartRepository.create({
        user: { id: userId } as User
      });
      cart = await this.userCartRepository.save(cart);
    }

    return cart;
  }

  /**
   * Récupère le panier d'un utilisateur avec tous ses items
   */
  async findCartByUserId(userId: number): Promise<UserCart> {
    const cart = await this.userCartRepository.findOne({
      where: { user: { id: userId } },
      relations: [
        'user',
        'cartItems',
        'cartItems.listing',
        'cartItems.listing.pokemonCard'
      ]
    });

    if (!cart) {
      return this.findOrCreateCart(userId);
    }

    return cart;
  }

  /**
   * Récupère un panier par son ID
   */
  async findOne(id: number, userId?: number): Promise<UserCart> {
    const cart = await this.userCartRepository.findOne({
      where: { id },
      relations: [
        'user',
        'cartItems',
        'cartItems.listing',
        'cartItems.listing.pokemonCard'
      ]
    });

    if (!cart) {
      throw new NotFoundException(`Cart with id ${id} not found`);
    }

    // Vérifier que le panier appartient à l'utilisateur si userId est fourni
    if (userId !== undefined && cart.user.id !== userId) {
      throw new BadRequestException('You can only access your own cart');
    }

    return cart;
  }

  /**
   * Ajoute un item au panier
   */
  async addItemToCart(
    userId: number,
    createCartItemDto: CreateCartItemDto
  ): Promise<CartItem> {
    // Vérifier que le listing existe
    const listing = await this.listingRepository.findOne({
      where: { id: createCartItemDto.listingId },
      relations: ['seller']
    });

    if (!listing) {
      throw new NotFoundException(
        `Listing with id ${createCartItemDto.listingId} not found`
      );
    }

    // Vérifier que l'utilisateur n'achète pas sa propre annonce
    if (listing.seller.id === userId) {
      throw new BadRequestException('You cannot add your own listing to cart');
    }

    // Vérifier la disponibilité
    if (listing.quantityAvailable < createCartItemDto.quantity) {
      throw new BadRequestException(
        `Not enough quantity available. Available: ${listing.quantityAvailable}, Requested: ${createCartItemDto.quantity}`
      );
    }

    // Récupérer ou créer le panier
    const cart = await this.findOrCreateCart(userId);

    // Vérifier si l'item existe déjà dans le panier
    const existingItem = await this.cartItemRepository.findOne({
      where: {
        cart: { id: cart.id },
        listing: { id: createCartItemDto.listingId }
      }
    });

    if (existingItem) {
      // Mettre à jour la quantité
      const newQuantity = existingItem.quantity + createCartItemDto.quantity;

      if (listing.quantityAvailable < newQuantity) {
        throw new BadRequestException(
          `Not enough quantity available. Available: ${listing.quantityAvailable}, Total requested: ${newQuantity}`
        );
      }

      existingItem.quantity = newQuantity;
      return this.cartItemRepository.save(existingItem);
    }

    // Créer un nouvel item
    const cartItem = this.cartItemRepository.create({
      cart,
      listing,
      quantity: createCartItemDto.quantity
    });

    return this.cartItemRepository.save(cartItem);
  }

  /**
   * Met à jour la quantité d'un item dans le panier
   */
  async updateCartItem(
    userId: number,
    itemId: number,
    updateCartItemDto: UpdateCartItemDto
  ): Promise<CartItem> {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: itemId },
      relations: ['cart', 'cart.user', 'listing']
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item with id ${itemId} not found`);
    }

    // Vérifier que le panier appartient à l'utilisateur
    if (cartItem.cart.user.id !== userId) {
      throw new BadRequestException(
        'You can only update items in your own cart'
      );
    }

    // Si on met à jour la quantité
    if (updateCartItemDto.quantity !== undefined) {
      // Vérifier la disponibilité
      if (cartItem.listing.quantityAvailable < updateCartItemDto.quantity) {
        throw new BadRequestException(
          `Not enough quantity available. Available: ${cartItem.listing.quantityAvailable}, Requested: ${updateCartItemDto.quantity}`
        );
      }

      cartItem.quantity = updateCartItemDto.quantity;
    }

    return this.cartItemRepository.save(cartItem);
  }

  /**
   * Supprime un item du panier
   */
  async removeItemFromCart(userId: number, itemId: number): Promise<void> {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: itemId },
      relations: ['cart', 'cart.user']
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item with id ${itemId} not found`);
    }

    // Vérifier que le panier appartient à l'utilisateur
    if (cartItem.cart.user.id !== userId) {
      throw new BadRequestException(
        'You can only remove items from your own cart'
      );
    }

    await this.cartItemRepository.remove(cartItem);
  }

  /**
   * Vide le panier
   */
  async clearCart(userId: number): Promise<void> {
    const cart = await this.userCartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['cartItems']
    });

    if (!cart) {
      return;
    }

    await this.cartItemRepository.remove(cart.cartItems);
  }

  /**
   * Supprime un panier (et tous ses items)
   */
  async remove(id: number, userId: number): Promise<void> {
    const cart = await this.findOne(id, userId);
    await this.userCartRepository.remove(cart);
  }
}
