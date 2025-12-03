import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CartDropdown from "@/components/Marketplace/CartDropdown";
import { cartService } from "@/services/cart.service";
import { useCartStore } from "@/store/cart.store";
import { useCurrencyStore, Currency } from "@/store/currency.store";
import type { Listing } from "@/types/listing";
import type { UserCart } from "@/types/cart";
import { CardState } from "@/utils/enums";
import { UserRole } from "@/types/auth";
import { Rarity } from "@/types/listing";

vi.mock("@/services/cart.service", () => ({
  cartService: {
    getMyCart: vi.fn(),
    addItemToCart: vi.fn(),
    updateCartItem: vi.fn(),
    removeItemFromCart: vi.fn(),
    clearCart: vi.fn(),
    deleteCart: vi.fn(),
  },
}));

const mockGetMyCart = vi.mocked(cartService.getMyCart);
const mockRemoveItem = vi.mocked(cartService.removeItemFromCart);

const baseListing = (overrides?: Partial<Listing>): Listing => ({
  id: 1,
  seller: {
    id: 99,
    email: "seller@test.com",
    firstName: "Seller",
    lastName: "Test",
    avatarUrl: "",
    role: UserRole.USER,
    isPro: false,
    createdAt: new Date(),
  },
  pokemonCard: {
    id: "card-1",
    name: "Pikachu",
    set: { id: "base", name: "Base" },
    rarity: Rarity.RARE,
  },
  price: 10,
  currency: Currency.USD,
  quantityAvailable: 3,
  cardState: CardState.NM,
  createdAt: new Date(),
  expiresAt: new Date(),
  ...overrides,
});

const buildCart = (items: UserCart["cartItems"]): UserCart => ({
  id: 1,
  user: {
    id: 1,
    email: "buyer@test.com",
    firstName: "Buyer",
    lastName: "Test",
  },
  cartItems: items,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const openDropdown = async () => {
  await userEvent.click(screen.getByRole("button"));
};

describe("CartDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    act(() => useCurrencyStore.getState().setCurrency(Currency.EUR));
    act(() => useCartStore.getState().reset());
  });

  afterEach(() => {
    act(() => useCartStore.getState().reset());
  });

  it("affiche l'état vide après chargement du panier", async () => {
    mockGetMyCart.mockResolvedValueOnce(buildCart([]));

    render(<CartDropdown />);
    await openDropdown();

    await screen.findByText("Votre panier est vide");
    expect(mockGetMyCart).toHaveBeenCalledTimes(1);
  });

  it("rende les éléments du panier et le total converti", async () => {
    const cart = buildCart([
      {
        id: 1,
        listing: baseListing(),
        quantity: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        listing: baseListing({
          id: 2,
          pokemonCard: {
            id: "card-2",
            name: "Salamèche",
            set: { id: "jungle", name: "Jungle" },
          },
          price: 5,
          currency: Currency.EUR,
        }),
        quantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    mockGetMyCart.mockResolvedValueOnce(cart);

    render(<CartDropdown />);
    await openDropdown();

    await screen.findByText("Pikachu");
    expect(screen.getByText("Salamèche")).toBeInTheDocument();

    const currencyStore = useCurrencyStore.getState();
    const totalValue =
      currencyStore.convertPrice(10, Currency.USD) * 2 +
      currencyStore.convertPrice(5, Currency.EUR) * 1;
    const expectedTotal = currencyStore.formatPrice(
      totalValue,
      currencyStore.currency,
    );

    expect(screen.getByText(expectedTotal)).toBeInTheDocument();
  });

  it("supprime un item et met à jour l'affichage", async () => {
    const cart = buildCart([
      {
        id: 1,
        listing: baseListing(),
        quantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        listing: baseListing({
          id: 2,
          pokemonCard: { id: "card-2", name: "Mew", set: { id: "base", name: "Base" } },
        }),
        quantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    mockGetMyCart.mockResolvedValueOnce(cart);
    mockRemoveItem.mockResolvedValue();

    render(<CartDropdown />);
    await openDropdown();
    await screen.findByText("Pikachu");

    const menuItems = screen.getAllByRole("menuitem");
    const pikachuRow = menuItems.find((item) =>
      within(item).queryByText("Pikachu"),
    );
    expect(pikachuRow).toBeTruthy();

    const deleteButton = within(pikachuRow as HTMLElement).getByRole("button");
    await userEvent.click(deleteButton);

    await waitFor(() => expect(mockRemoveItem).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(screen.queryByText("Pikachu")).not.toBeInTheDocument(),
    );
  });
});
