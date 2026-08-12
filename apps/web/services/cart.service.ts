import { authedFetch } from "@/utils/fetch";
import {
  UserCart,
  CartItem,
  CreateCartItemDto,
  UpdateCartItemDto,
} from "@/types/cart";

export const cartService = {
  /**
   * Retrieves the current user's cart.
   */
  async getMyCart(): Promise<UserCart> {
    return authedFetch<UserCart>("GET", "/user-cart/me");
  },

  /**
   * Retrieves a cart by its identifier.
   */
  async getCartById(id: number): Promise<UserCart> {
    return authedFetch<UserCart>("GET", `/user-cart/${id}`);
  },

  /**
   * Adds an item to the cart.
   */
  async addItemToCart(data: CreateCartItemDto): Promise<CartItem> {
    return authedFetch<CartItem>("POST", "/user-cart/items", { data });
  },

  /**
   * Updates a cart item quantity.
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
   * Removes an item from the cart.
   */
  async removeItemFromCart(itemId: number): Promise<void> {
    return authedFetch<void>("DELETE", `/user-cart/items/${itemId}`);
  },

  /**
   * Empties the cart.
   */
  async clearCart(): Promise<void> {
    return authedFetch<void>("DELETE", "/user-cart/me/clear");
  },

  /**
   * Deletes a cart.
   */
  async deleteCart(id: number): Promise<void> {
    return authedFetch<void>("DELETE", `/user-cart/${id}`);
  },
};
