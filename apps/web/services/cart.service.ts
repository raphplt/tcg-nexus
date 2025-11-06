import { authedFetch, fetcher } from "@/utils/fetch";
import {
  UserCart,
  CartItem,
  CreateCartItemDto,
  UpdateCartItemDto,
} from "@/types/cart";

export const cartService = {
  /**
   * Récupère le panier de l'utilisateur connecté
   */
  async getMyCart(): Promise<UserCart> {
    return authedFetch<UserCart>("GET", "/user-cart/me");
  },

  /**
   * Récupère un panier par son ID
   */
  async getCartById(id: number): Promise<UserCart> {
    return authedFetch<UserCart>("GET", `/user-cart/${id}`);
  },

  /**
   * Ajoute un item au panier
   */
  async addItemToCart(data: CreateCartItemDto): Promise<CartItem> {
    return authedFetch<CartItem>("POST", "/user-cart/items", { data });
  },

  /**
   * Met à jour la quantité d'un item dans le panier
   */
  async updateCartItem(
    itemId: number,
    data: UpdateCartItemDto,
  ): Promise<CartItem> {
    return authedFetch<CartItem>("PATCH", `/user-cart/items/${itemId}`, {
      data,
    });
  },

  /**
   * Supprime un item du panier
   */
  async removeItemFromCart(itemId: number): Promise<void> {
    return authedFetch<void>("DELETE", `/user-cart/items/${itemId}`);
  },

  /**
   * Vide le panier
   */
  async clearCart(): Promise<void> {
    return authedFetch<void>("DELETE", "/user-cart/me/clear");
  },

  /**
   * Supprime un panier
   */
  async deleteCart(id: number): Promise<void> {
    return authedFetch<void>("DELETE", `/user-cart/${id}`);
  },
};

