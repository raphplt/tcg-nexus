import { create } from "zustand";
import { UserCart, CreateCartItemDto, UpdateCartItemDto } from "@/types/cart";
import { cartService } from "@/services/cart.service";
import { useCurrencyStore } from "./currency.store";

interface CartState {
  cart: UserCart | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCart: () => Promise<void>;
  addItem: (data: CreateCartItemDto) => Promise<void>;
  updateItem: (itemId: number, data: UpdateCartItemDto) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  setCart: (cart: UserCart | null) => void;
  reset: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  error: null,

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartService.getMyCart();
      set({ cart, isLoading: false });
    } catch (error: any) {
      set({
        error:
          error?.response?.data?.message ||
          "Erreur lors du chargement du panier",
        isLoading: false,
      });
    }
  },

  addItem: async (data: CreateCartItemDto) => {
    set({ isLoading: true, error: null });
    try {
      await cartService.addItemToCart(data);
      // Recharger le panier après ajout
      await get().fetchCart();
    } catch (error: any) {
      set({
        error:
          error?.response?.data?.message || "Erreur lors de l'ajout au panier",
        isLoading: false,
      });
      throw error;
    }
  },

  updateItem: async (itemId: number, data: UpdateCartItemDto) => {
    set({ isLoading: true, error: null });
    try {
      await cartService.updateCartItem(itemId, data);
      // Recharger le panier après mise à jour
      await get().fetchCart();
    } catch (error: any) {
      set({
        error:
          error?.response?.data?.message ||
          "Erreur lors de la mise à jour du panier",
        isLoading: false,
      });
      throw error;
    }
  },

  removeItem: async (itemId: number) => {
    set({ isLoading: true, error: null });
    try {
      await cartService.removeItemFromCart(itemId);
      // Mettre à jour le panier localement sans recharger
      const currentCart = get().cart;
      if (currentCart) {
        set({
          cart: {
            ...currentCart,
            cartItems: currentCart.cartItems.filter(
              (item) => item.id !== itemId,
            ),
          },
          isLoading: false,
        });
      } else {
        await get().fetchCart();
      }
    } catch (error: any) {
      set({
        error:
          error?.response?.data?.message ||
          "Erreur lors de la suppression du panier",
        isLoading: false,
      });
      throw error;
    }
  },

  clearCart: async () => {
    set({ isLoading: true, error: null });
    try {
      await cartService.clearCart();
      set({
        cart: get().cart ? { ...get().cart!, cartItems: [] } : null,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error:
          error?.response?.data?.message || "Erreur lors du vidage du panier",
        isLoading: false,
      });
      throw error;
    }
  },

  setCart: (cart: UserCart | null) => {
    set({ cart });
  },

  reset: () => {
    set({
      cart: null,
      isLoading: false,
      error: null,
    });
  },
}));

// Sélecteurs utiles
export const useCartItems = () =>
  useCartStore((state) => state.cart?.cartItems || []);
export const useCartTotal = () =>
  useCartStore((state) => {
    if (!state.cart?.cartItems?.length) return 0;
    const { convertPrice, currency } = useCurrencyStore.getState();
    
    return state.cart.cartItems.reduce((total, item) => {
      const priceInSelectedCurrency = convertPrice(item.listing.price, item.listing.currency);
      return total + priceInSelectedCurrency * item.quantity;
    }, 0);
  });
export const useCartItemsCount = () =>
  useCartStore((state) => {
    if (!state.cart?.cartItems?.length) return 0;
    return state.cart.cartItems.reduce(
      (count, item) => count + item.quantity,
      0,
    );
  });
