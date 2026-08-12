import {
  BadRequestException,
  HttpStatus,
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

@Injectable()
export class UserCartService {
  constructor(
    @InjectRepository(UserCart)
    private userCartRepository: Repository<UserCart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
  ) {}

  /**
   * Crée ou récupère le panier d'un utilisateur
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
   * Récupère le panier d'un utilisateur avec tous ses items
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
   * Récupère un panier par son ID
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

    // Vérifier que le panier appartient à l'utilisateur si userId est fourni
    if (userId !== undefined && cart.user.id !== userId) {
      throw new BadRequestException(
        "Vous ne pouvez consulter que votre propre panier",
      );
    }

    return cart;
  }

  /**
   * Ajoute un item au panier
   */
  async addItemToCart(
    userId: number,
    createCartItemDto: CreateCartItemDto,
  ): Promise<CartItem> {
    // Vérifier que le listing existe
    const listing = await this.listingRepository.findOne({
      where: { id: createCartItemDto.listingId },
      relations: ["seller"],
    });

    if (!listing) {
      throw new NotFoundException(
        `Annonce ${createCartItemDto.listingId} introuvable`,
      );
    }

    // Vérifier que l'utilisateur n'achète pas sa propre annonce
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

    // Vérifier la disponibilité
    if (listing.quantityAvailable < createCartItemDto.quantity) {
      throw new BadRequestException(
        `Stock insuffisant : ${listing.quantityAvailable} disponible(s), ${createCartItemDto.quantity} demandé(s)`,
      );
    }

    // Récupérer ou créer le panier
    const cart = await this.findOrCreateCart(userId);

    await this.assertSameCurrency(cart.id, listing);

    // Vérifier si l'item existe déjà dans le panier
    const existingItem = await this.cartItemRepository.findOne({
      where: {
        cart: { id: cart.id },
        listing: { id: createCartItemDto.listingId },
      },
    });

    if (existingItem) {
      // Mettre à jour la quantité
      const newQuantity = existingItem.quantity + createCartItemDto.quantity;

      if (listing.quantityAvailable < newQuantity) {
        throw new BadRequestException(
          `Stock insuffisant : ${listing.quantityAvailable} disponible(s), ${newQuantity} au total dans votre panier`,
        );
      }

      existingItem.quantity = newQuantity;
      return this.cartItemRepository.save(existingItem);
    }

    // Créer un nouvel item
    const cartItem = this.cartItemRepository.create({
      cart,
      listing,
      quantity: createCartItemDto.quantity,
    });

    return this.cartItemRepository.save(cartItem);
  }

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
   * Met à jour la quantité d'un item dans le panier
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

    // Vérifier que le panier appartient à l'utilisateur
    if (cartItem.cart.user.id !== userId) {
      throw new BadRequestException(
        "Vous ne pouvez modifier que les articles de votre propre panier",
      );
    }

    // Si on met à jour la quantité
    if (updateCartItemDto.quantity !== undefined) {
      // Vérifier la disponibilité
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
   * Supprime un item du panier
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

    // Vérifier que le panier appartient à l'utilisateur
    if (cartItem.cart.user.id !== userId) {
      throw new BadRequestException(
        "Vous ne pouvez retirer que les articles de votre propre panier",
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
      relations: ["cartItems"],
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
