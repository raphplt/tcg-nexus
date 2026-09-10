import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditListingPage from "@/app/[locale]/(main)/marketplace/listings/[id]/edit/page";
import { marketplaceService } from "@/services/marketplace.service";
import type { Listing } from "@/types/listing";
import { navigationMocks } from "@/test/setup";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 7 } }),
}));

vi.mock("@/hooks/useMarketplace", () => ({
  usePriceSuggestion: () => ({ data: null, isLoading: false }),
  useShippingPolicy: () => ({ data: null }),
}));

vi.mock("@/services/marketplace.service", () => ({
  marketplaceService: {
    getListingById: vi.fn(),
    updateListing: vi.fn(),
  },
}));

const cardListing = {
  id: 12,
  price: "15.00",
  currency: "EUR",
  quantityAvailable: 3,
  cardState: "NM",
  language: "en",
  status: "active",
  description: "",
  seller: { id: 7 },
  pokemonCard: { id: "card-1", name: "Pikachu", set: { id: "base" } },
} as unknown as Listing;

describe("Edit listing page", () => {
  beforeEach(() => {
    navigationMocks.setParams({ id: "12" });
  });

  it("saves the edited price and visibility", async () => {
    vi.mocked(marketplaceService.getListingById).mockResolvedValue(cardListing);
    vi.mocked(marketplaceService.updateListing).mockResolvedValue(cardListing);
    const user = userEvent.setup();

    render(<EditListingPage />);

    const price = await screen.findByRole("spinbutton", { name: "Prix" });
    expect(price).toHaveValue(15);
    await user.clear(price);
    await user.type(price, "20");
    await user.click(screen.getByRole("switch", { name: "En vente" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(marketplaceService.updateListing).toHaveBeenCalledWith(
        "12",
        expect.objectContaining({
          price: 20,
          quantityAvailable: 3,
          cardState: "NM",
          language: "en",
          status: "inactive",
        }),
      );
    });
  });

  it("hides the card condition for sealed products", async () => {
    vi.mocked(marketplaceService.getListingById).mockResolvedValue({
      ...cardListing,
      cardState: null,
      pokemonCard: undefined,
      sealedProduct: { id: "etb", name: "Coffret Dresseur d'élite" },
    } as unknown as Listing);

    render(<EditListingPage />);

    expect(
      await screen.findByRole("heading", { name: "Coffret Dresseur d'élite" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("refuses to edit another seller's listing", async () => {
    vi.mocked(marketplaceService.getListingById).mockResolvedValue({
      ...cardListing,
      seller: { id: 99 },
    } as unknown as Listing);

    render(<EditListingPage />);

    expect(
      await screen.findByText("Vous ne pouvez modifier que vos annonces."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
});
