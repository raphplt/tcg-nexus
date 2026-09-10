import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CardForm from "@/app/[locale]/(main)/marketplace/create/_components/cardForm";
import { marketplaceService } from "@/services/marketplace.service";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { navigationMocks } from "@/test/setup";

vi.mock("@/hooks/useMarketplace", () => ({
  useInfiniteMarketplaceCards: () => ({
    items: [],
    sets: [],
    series: [],
    isLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  }),
  usePriceSuggestion: () => ({ data: null, isLoading: false }),
  useShippingPolicy: () => ({ data: null }),
}));

vi.mock("@/services/pokemonCard.service", () => ({
  pokemonCardService: {
    getById: vi.fn(),
  },
}));

vi.mock("@/services/marketplace.service", () => ({
  marketplaceService: {
    createListing: vi.fn(),
  },
}));

const volcanion = {
  id: "67c3850f-0226-4c99-b12a-a2ee5095eb94",
  name: "Volcanion ◇",
  localId: "31",
  set: { id: "sm6", name: "Lumière Interdite" },
};

describe("Marketplace CardForm", () => {
  beforeEach(() => {
    navigationMocks.setSearchParams({ cardId: volcanion.id });
    vi.mocked(pokemonCardService.getById).mockResolvedValue(volcanion);
  });

  it("preselects the card provided by the listing creation URL", async () => {
    render(<CardForm />);

    await waitFor(() => {
      expect(pokemonCardService.getById).toHaveBeenCalledWith(volcanion.id);
    });

    expect(
      await screen.findByRole("heading", { name: "Volcanion ◇" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Lumière Interdite")).toBeInTheDocument();
  });

  it("lists the selected card with the chosen details", async () => {
    vi.mocked(marketplaceService.createListing).mockResolvedValue(
      {} as Awaited<ReturnType<typeof marketplaceService.createListing>>,
    );
    const user = userEvent.setup();

    render(<CardForm />);
    await screen.findByRole("heading", { name: "Volcanion ◇" });

    await user.type(screen.getByRole("spinbutton", { name: "Prix" }), "12");
    await user.click(screen.getByRole("radio", { name: "Excellent" }));
    await user.click(
      screen.getByRole("button", { name: "Augmenter la quantité" }),
    );
    await user.click(screen.getByRole("button", { name: "Mettre en vente" }));

    await waitFor(() => {
      expect(marketplaceService.createListing).toHaveBeenCalledWith(
        expect.objectContaining({
          pokemonCardId: volcanion.id,
          price: 12,
          quantityAvailable: 2,
          cardState: "EX",
          currency: "EUR",
          language: "fr",
        }),
      );
    });
  });

  it("requires a price before listing", async () => {
    const user = userEvent.setup();

    render(<CardForm />);
    await screen.findByRole("heading", { name: "Volcanion ◇" });

    await user.click(screen.getByRole("button", { name: "Mettre en vente" }));

    expect(
      await screen.findByText("Indiquez un prix supérieur à 0."),
    ).toBeInTheDocument();
    expect(marketplaceService.createListing).not.toHaveBeenCalled();
  });
});
