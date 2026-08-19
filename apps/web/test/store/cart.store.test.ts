import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useCartItems,
  useCartItemsCount,
  useCartStore,
  useCartTotal,
} from "@/store/cart.store";
import { cartService } from "@/services/cart.service";

vi.mock("@/services/cart.service", () => ({
  cartService: {
    getMyCart: vi.fn(),
    addItemToCart: vi.fn(),
    updateCartItem: vi.fn(),
    removeItemFromCart: vi.fn(),
    clearCart: vi.fn(),
  },
}));

describe("useCartStore", () => {
  beforeEach(() => {
    useCartStore.getState().reset();
    vi.clearAllMocks();
  });

  it("fetches cart successfully", async () => {
    const mockCart: any = {
      id: 1,
      cartItems: [
        {
          id: 10,
          quantity: 2,
          listing: { price: 15, currency: "EUR" },
        },
      ],
    };
    vi.mocked(cartService.getMyCart).mockResolvedValue(mockCart);

    await useCartStore.getState().fetchCart();

    expect(useCartStore.getState().cart).toEqual(mockCart);
    expect(useCartStore.getState().isLoading).toBe(false);
    expect(useCartStore.getState().error).toBeNull();
  });

  it("handles fetchCart errors gracefully", async () => {
    vi.mocked(cartService.getMyCart).mockRejectedValue({
      response: { data: { message: "Server error" } },
    });

    await useCartStore.getState().fetchCart();

    expect(useCartStore.getState().cart).toBeNull();
    expect(useCartStore.getState().error).toBe("Server error");
  });

  it("adds item and refreshes cart", async () => {
    const mockCart: any = { id: 1, cartItems: [] };
    vi.mocked(cartService.getMyCart).mockResolvedValue(mockCart);
    vi.mocked(cartService.addItemToCart).mockResolvedValue({} as any);

    await useCartStore.getState().addItem({ listingId: 5, quantity: 1 });

    expect(cartService.addItemToCart).toHaveBeenCalledWith({
      listingId: 5,
      quantity: 1,
    });
    expect(cartService.getMyCart).toHaveBeenCalled();
  });

  it("updates item quantity and refreshes cart", async () => {
    const mockCart: any = { id: 1, cartItems: [] };
    vi.mocked(cartService.getMyCart).mockResolvedValue(mockCart);
    vi.mocked(cartService.updateCartItem).mockResolvedValue({} as any);

    await useCartStore.getState().updateItem(10, { quantity: 3 });

    expect(cartService.updateCartItem).toHaveBeenCalledWith(10, {
      quantity: 3,
    });
    expect(cartService.getMyCart).toHaveBeenCalled();
  });

  it("removes item optimistically from state", async () => {
    const initialCart: any = {
      id: 1,
      cartItems: [
        { id: 1, quantity: 1 },
        { id: 2, quantity: 2 },
      ],
    };
    useCartStore.getState().setCart(initialCart);
    vi.mocked(cartService.removeItemFromCart).mockResolvedValue(undefined);

    await useCartStore.getState().removeItem(1);

    expect(useCartStore.getState().cart?.cartItems).toEqual([
      { id: 2, quantity: 2 },
    ]);
  });

  it("clears cart successfully", async () => {
    const initialCart: any = {
      id: 1,
      cartItems: [{ id: 1, quantity: 1 }],
    };
    useCartStore.getState().setCart(initialCart);
    vi.mocked(cartService.clearCart).mockResolvedValue(undefined);

    await useCartStore.getState().clearCart();

    expect(useCartStore.getState().cart?.cartItems).toEqual([]);
  });

  it("calculates cart total and item counts with currency conversion", () => {
    const mockCart: any = {
      id: 1,
      cartItems: [
        {
          id: 1,
          quantity: 2,
          listing: { price: 10, currency: "EUR" },
        },
        {
          id: 2,
          quantity: 3,
          listing: { price: 20, currency: "EUR" },
        },
      ],
    };
    useCartStore.getState().setCart(mockCart);

    const { result: totalResult } = renderHook(() => useCartTotal());
    const { result: countResult } = renderHook(() => useCartItemsCount());
    const { result: itemsResult } = renderHook(() => useCartItems());

    expect(countResult.current).toBe(5);
    expect(totalResult.current).toBe(10 * 2 + 20 * 3);
    expect(itemsResult.current).toHaveLength(2);
  });
});
