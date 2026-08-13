import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CardForm from "@/app/[locale]/(main)/marketplace/create/_components/cardForm";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { navigationMocks } from "@/test/setup";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useMarketplace", () => ({
  useMarketplaceCards: () => ({
    data: { data: [], meta: undefined },
    sets: [],
    series: [],
    isLoading: false,
  }),
  usePriceSuggestion: () => ({ data: null, isLoading: false }),
  useShippingPolicy: () => ({ data: null }),
}));

vi.mock("@/services/pokemonCard.service", () => ({
  pokemonCardService: {
    getById: vi.fn(),
  },
}));

describe("Marketplace CardForm", () => {
  beforeEach(() => {
    navigationMocks.setSearchParams({
      cardId: "67c3850f-0226-4c99-b12a-a2ee5095eb94",
    });
  });

  it("preselects the card provided by the listing creation URL", async () => {
    vi.mocked(pokemonCardService.getById).mockResolvedValue({
      id: "67c3850f-0226-4c99-b12a-a2ee5095eb94",
      name: "Volcanion ◇",
      localId: "31",
      set: { id: "sm6", name: "Lumière Interdite" },
    });

    render(<CardForm />);

    await waitFor(() => {
      expect(pokemonCardService.getById).toHaveBeenCalledWith(
        "67c3850f-0226-4c99-b12a-a2ee5095eb94",
      );
    });

    expect(
      await screen.findByRole("heading", { name: "Volcanion ◇" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Lumière Interdite")).toBeInTheDocument();
  });
});
