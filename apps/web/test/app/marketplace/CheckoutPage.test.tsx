process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_123";

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutPage from "@/app/[locale]/(main)/marketplace/checkout/page";
import messages from "@/messages/en.json";
import { paymentService } from "@/services/payment.service";

vi.unmock("next-intl");

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn().mockResolvedValue({}),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-elements">{children}</div>
  ),
  useStripe: () => ({}),
  useElements: () => ({}),
  PaymentElement: () => <div data-testid="payment-element" />,
}));

vi.mock("@/services/payment.service", () => ({
  paymentService: {
    getPendingCheckout: vi.fn(),
    startCheckout: vi.fn(),
    cancelPendingOrder: vi.fn(),
    confirmOrder: vi.fn(),
    getMyOrders: vi.fn(),
    getOrderById: vi.fn(),
  },
}));

const mockCart = {
  cart: {
    cartItems: [
      {
        id: 1,
        quantity: 1,
        listing: {
          id: 10,
          price: 25,
          currency: "EUR",
          pokemonCard: {
            name: "Pikachu",
            image: "/pika.png",
            set: { name: "Base" },
          },
        },
      },
    ],
  },
  isLoading: false,
  fetchCart: vi.fn(),
};

vi.mock("@/store/cart.store", () => ({
  useCartStore: () => mockCart,
  useCartTotal: () => 25,
}));

vi.mock("@/store/currency.store", () => ({
  useCurrencyStore: () => ({
    currency: "EUR",
    formatExact: (val: number, curr: string) => `${val} ${curr}`,
  }),
}));

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <CheckoutPage />
      </NextIntlClientProvider>,
    );

  it("resumes an active pending session with item snapshot and timer", async () => {
    vi.mocked(paymentService.getPendingCheckout).mockResolvedValueOnce({
      orderId: 777,
      clientSecret: "pi_test_secret",
      amount: 30,
      shippingAmount: 5,
      currency: "EUR",
      shippingAddress: "42 Wallaby Way",
      reservationExpiresAt: new Date(Date.now() + 600000).toISOString(),
      items: [
        {
          id: 101,
          productName: "Charizard",
          productImage: "/charizard.png",
          productCondition: "NM",
          productSetName: "Base Set",
          productKind: "card",
          quantity: 1,
          unitPrice: 25,
        },
      ],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Charizard")).toBeInTheDocument();
      expect(screen.getByText(/Time left:/i)).toBeInTheDocument();
      expect(screen.getByText("Cancel reservation")).toBeInTheDocument();
    });
  });

  it("cancels pending reservation and resets session", async () => {
    vi.mocked(paymentService.getPendingCheckout).mockResolvedValueOnce({
      orderId: 777,
      clientSecret: "pi_test_secret",
      amount: 30,
      shippingAmount: 5,
      currency: "EUR",
      shippingAddress: "42 Wallaby Way",
      reservationExpiresAt: new Date(Date.now() + 600000).toISOString(),
      items: [
        {
          id: 101,
          productName: "Charizard",
          productImage: "/charizard.png",
          productCondition: "NM",
          productSetName: "Base Set",
          productKind: "card",
          quantity: 1,
          unitPrice: 25,
        },
      ],
    });
    vi.mocked(paymentService.cancelPendingOrder).mockResolvedValueOnce({
      success: true,
      orderId: 777,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Cancel reservation")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cancel reservation"));

    await waitFor(() => {
      expect(paymentService.cancelPendingOrder).toHaveBeenCalledWith(777);
      expect(mockCart.fetchCart).toHaveBeenCalled();
    });
  });

  it("renders expired reservation notice when timer expires", async () => {
    vi.mocked(paymentService.getPendingCheckout).mockResolvedValueOnce({
      orderId: 777,
      clientSecret: "pi_test_secret",
      amount: 30,
      shippingAmount: 5,
      currency: "EUR",
      shippingAddress: "42 Wallaby Way",
      reservationExpiresAt: new Date(Date.now() - 5000).toISOString(),
      items: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Reservation expired")).toBeInTheDocument();
      expect(screen.getByText("Return to marketplace")).toBeInTheDocument();
    });
  });
});
