import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Listing } from "src/marketplace/entities/listing.entity";
import { User } from "src/user/entities/user.entity";
import { Repository } from "typeorm";
import { CreateCartItemDto } from "./dto/create-cart-item.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";
import { CartItem } from "./entities/cart-item.entity";
import { UserCart } from "./entities/user_cart.entity";

/**
 * Service managing shopping carts and item lifecycles for users.
 */
@Injectable()
export class UserCartService {
  constructor(
    @InjectRepository(UserCart)
    private readonly userCartRepository: Repository<UserCart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
  ) {}

  /**
   * Retrieves an existing cart for a user or initializes a new one.
   *
   * @param userId Unique identifier of the user.
   * @returns Active cart record.
   */
  async findOrCreateCart(userId: number): Promise<UserCart> {
    let cart = await this.userCartRepository.findOne({
      where: { user: { id: userId } },
      relations: ["user"],
    });

    if (!cart) {
      cart = this.userCartRepository.create({
        user: { id: userId } as User,
      });
      cart = await this.userCartRepository.save(cart);
    }

    return cart;
  }

  /**
   * Finds a user's cart including populated listings and catalog relations.
   *
   * @param userId Unique identifier of the user.
   * @returns Detailed user cart entity.
   */
  async findCartByUserId(userId: number): Promise<UserCart> {
    const cart = await this.userCartRepository.findOne({
      where: { user: { id: userId } },
      relations: [
        "user",
        "cartItems",
        "cartItems.listing",
        "cartItems.listing.pokemonCard",
        "cartItems.listing.pokemonCard.set",
        "cartItems.listing.sealedProduct",
        "cartItems.listing.sealedProduct.pokemonSet",
        "cartItems.listing.seller",
      ],
    });

    if (!cart) {
      return this.findOrCreateCart(userId);
    }

    return cart;
  }

  /**
   * Finds a cart by primary key ID, validating ownership if a user ID is supplied.
   *
   * @param id Cart unique identifier.
   * @param userId Optional user identifier for ownership validation.
   * @returns Matching cart entity.
   * @throws NotFoundException When the cart does not exist.
   * @throws BadRequestException When the cart does not belong to the requesting user.
   */
  async findOne(id: number, userId?: number): Promise<UserCart> {
    const cart = await this.userCartRepository.findOne({
      where: { id },
      relations: [
        "user",
        "cartItems",
        "cartItems.listing",
        "cartItems.listing.pokemonCard",
        "cartItems.listing.pokemonCard.set",
        "cartItems.listing.sealedProduct",
        "cartItems.listing.sealedProduct.pokemonSet",
      ],
    });

    if (!cart) {
      throw new NotFoundException(`Panier ${id} introuvable`);
    }

    if (userId !== undefined && cart.user.id !== userId) {
      throw new BadRequestException(
        "Vous ne pouvez consulter que votre propre panier",
      );
    }

    return cart;
  }

  /**
   * Adds a marketplace listing to the user's cart.
   *
   * @param userId Authenticated user adding the item.
   * @param createCartItemDto Target listing ID and requested quantity.
   * @returns Created or updated cart item.
   * @throws NotFoundException When the listing does not exist.
   * @throws BadRequestException When trying to buy one's own listing, expired listings, or exceeding stock.
   */
  async addItemToCart(
    userId: number,
    createCartItemDto: CreateCartItemDto,
  ): Promise<CartItem> {
    const listing = await this.listingRepository.findOne({
      where: { id: createCartItemDto.listingId },
      relations: ["seller"],
    });

    if (!listing) {
      throw new NotFoundException(
        `Annonce ${createCartItemDto.listingId} introuvable`,
      );
    }

    if (listing.seller.id === userId) {
      throw new BadRequestException(
        "Vous ne pouvez pas ajouter votre propre annonce au panier",
      );
    }

    if (listing.expiresAt && new Date(listing.expiresAt) <= new Date()) {
      throw new BadRequestException({
        code: "LISTING_EXPIRED",
        message: "Cette annonce a expiré",
      });
    }

    if (listing.quantityAvailable < createCartItemDto.quantity) {
      throw new BadRequestException(
        `Stock insuffisant : ${listing.quantityAvailable} disponible(s), ${createCartItemDto.quantity} demandé(s)`,
      );
    }

    const cart = await this.findOrCreateCart(userId);
    await this.assertSameCurrency(cart.id, listing);

    const existingItem = await this.cartItemRepository.findOne({
      where: {
        cart: { id: cart.id },
        listing: { id: createCartItemDto.listingId },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + createCartItemDto.quantity;

      if (listing.quantityAvailable < newQuantity) {
        throw new BadRequestException(
          `Stock insuffisant : ${listing.quantityAvailable} disponible(s), ${newQuantity} au total dans votre panier`,
        );
      }

      existingItem.quantity = newQuantity;
      return this.cartItemRepository.save(existingItem);
    }

    const cartItem = this.cartItemRepository.create({
      cart,
      listing,
      quantity: createCartItemDto.quantity,
    });

    return this.cartItemRepository.save(cartItem);
  }

  /**
   * Asserts that items in a cart share the same currency denomination.
   */
  private async assertSameCurrency(
    cartId: number,
    listing: Listing,
  ): Promise<void> {
    const existing = await this.cartItemRepository.findOne({
      where: { cart: { id: cartId } },
      relations: ["listing"],
    });

    if (existing && existing.listing.currency !== listing.currency) {
      throw new BadRequestException(
        `Votre panier est en ${existing.listing.currency}. Videz-le avant d'ajouter un article en ${listing.currency}.`,
      );
    }
  }

  /**
   * Updates the selected quantity for an item within the user's cart.
   *
   * @param userId Authenticated user identifier.
   * @param itemId Cart item identifier.
   * @param updateCartItemDto Quantity update payload.
   * @returns Updated cart item.
   * @throws NotFoundException When item is not in the cart.
   * @throws BadRequestException When user does not own the cart or requested quantity exceeds available stock.
   */
  async updateCartItem(
    userId: number,
    itemId: number,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartItem> {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: itemId },
      relations: ["cart", "cart.user", "listing"],
    });

    if (!cartItem) {
      throw new NotFoundException(
        `Article ${itemId} introuvable dans le panier`,
      );
    }

    if (cartItem.cart.user.id !== userId) {
      throw new BadRequestException(
        "Vous ne pouvez modifier que les articles de votre propre panier",
      );
    }

    if (updateCartItemDto.quantity !== undefined) {
      if (cartItem.listing.quantityAvailable < updateCartItemDto.quantity) {
        throw new BadRequestException(
          `Stock insuffisant : ${cartItem.listing.quantityAvailable} disponible(s), ${updateCartItemDto.quantity} demandé(s)`,
        );
      }

      cartItem.quantity = updateCartItemDto.quantity;
    }

    return this.cartItemRepository.save(cartItem);
  }

  /**
   * Removes an individual item from the user's cart.
   *
   * @param userId Authenticated user identifier.
   * @param itemId Cart item identifier.
   * @throws NotFoundException When the item does not exist.
   * @throws BadRequestException When the cart does not belong to the user.
   */
  async removeItemFromCart(userId: number, itemId: number): Promise<void> {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: itemId },
      relations: ["cart", "cart.user"],
    });

    if (!cartItem) {
      throw new NotFoundException(
        `Article ${itemId} introuvable dans le panier`,
      );
    }

    if (cartItem.cart.user.id !== userId) {
      throw new BadRequestException(
        "Vous ne pouvez retirer que les articles de votre propre panier",
      );
    }

    await this.cartItemRepository.remove(cartItem);
  }

  /**
   * Removes all items from the user's cart.
   *
   * @param userId Authenticated user identifier.
   */
  async clearCart(userId: number): Promise<void> {
    const cart = await this.userCartRepository.findOne({
      where: { user: { id: userId } },
      relations: ["cartItems"],
    });

    if (!cart) {
      return;
    }

    await this.cartItemRepository.remove(cart.cartItems);
  }

  /**
   * Deletes an entire cart entity and cascades item deletion.
   *
   * @param id Cart primary key identifier.
   * @param userId Authenticated user identifier.
   */
  async remove(id: number, userId: number): Promise<void> {
    const cart = await this.findOne(id, userId);
    await this.userCartRepository.remove(cart);
  }
}
