import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  getCardStateColor,
  getConditionLabel,
} from "@/app/[locale]/(main)/marketplace/utils";
import { PriceSuggestionHint } from "@/app/[locale]/(main)/marketplace/_components/PriceSuggestionHint";
import { ShippingPolicyNotice } from "@/app/[locale]/(main)/marketplace/_components/ShippingPolicyNotice";
import {
  hasReferencePrices,
  ReferencePrices,
} from "@/app/[locale]/(main)/marketplace/cards/[id]/_components/ReferencePrices";
import { AddToCollectionDialog } from "@/app/[locale]/(main)/marketplace/cards/[id]/_components/AddToCollectionDialog";
import { usePriceSuggestion, useShippingPolicy } from "@/hooks/useMarketplace";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { collectionService } from "@/services/collection.service";
import { AuthContext } from "@/contexts/AuthContext";

vi.mock("@/hooks/useMarketplace", () => ({
  usePriceSuggestion: vi.fn(),
  useShippingPolicy: vi.fn(),
}));

vi.mock("@/services/pokemonCard.service", () => ({
  pokemonCardService: {
    addToWishlist: vi.fn(),
    addToFavorites: vi.fn(),
    addToCollection: vi.fn(),
  },
}));

vi.mock("@/services/collection.service", () => ({
  collectionService: {
    getMyCollections: vi.fn(),
    getByUserId: vi.fn(),
  },
}));

describe("Marketplace Components & Utilities", () => {
  describe("marketplace utils", () => {
    it("returns correct condition labels and state colors", () => {
      expect(getConditionLabel("sealed")).toBe("Scellé d'usine");
      expect(getConditionLabel("box_damaged")).toBe("Boîte abîmée");
      expect(getConditionLabel("")).toBe("");

      expect(getCardStateColor("NM")).toContain("bg-green-500/20");
      expect(getCardStateColor("EX")).toContain("bg-yellow-500/20");
      expect(getCardStateColor("GD")).toContain("bg-blue-500/20");
      expect(getCardStateColor("LP")).toContain("bg-orange-500/20");
      expect(getCardStateColor("PL")).toContain("bg-purple-500/20");
      expect(getCardStateColor("Poor")).toContain("bg-red-500/20");
      expect(getCardStateColor("UNKNOWN")).toContain("bg-muted");
    });
  });

  describe("PriceSuggestionHint", () => {
    it("renders suggested price and handles onApply", () => {
      const onApply = vi.fn();
      vi.mocked(usePriceSuggestion).mockReturnValue({
        data: {
          suggestedPrice: 19.99,
          currency: "EUR",
          basis: "same-state",
          listings: { count: 3 },
        },
        isLoading: false,
      } as any);

      render(
        <PriceSuggestionHint
          cardId="card-1"
          cardState="NM"
          currency="EUR"
          onApply={onApply}
        />,
      );

      expect(screen.getByText(/Prix conseillé :/)).toBeInTheDocument();
      expect(screen.getByText(/19/)).toBeInTheDocument();

      const useBtn = screen.getByRole("button");
      fireEvent.click(useBtn);
      expect(onApply).toHaveBeenCalledWith(19.99);
    });

    it("renders computing and empty state", () => {
      vi.mocked(usePriceSuggestion).mockReturnValue({
        data: null,
        isLoading: true,
      } as any);

      const { rerender } = render(
        <PriceSuggestionHint
          cardId="card-1"
          currency="EUR"
          onApply={vi.fn()}
        />,
      );
      expect(screen.getByText(/Calcul du prix conseillé/)).toBeInTheDocument();

      vi.mocked(usePriceSuggestion).mockReturnValue({
        data: null,
        isLoading: false,
      } as any);
      rerender(
        <PriceSuggestionHint
          cardId="card-1"
          currency="EUR"
          onApply={vi.fn()}
        />,
      );
      expect(screen.getByText(/Aucune référence de prix/)).toBeInTheDocument();
    });
  });

  describe("ShippingPolicyNotice", () => {
    it("renders shipping rate and handling time", () => {
      vi.mocked(useShippingPolicy).mockReturnValue({
        data: {
          handlingTimeDays: 2,
          rates: [{ productKind: "card", label: "Lettre suivie", cost: 2.5 }],
        },
      } as any);

      render(<ShippingPolicyNotice productKind="card" />);

      expect(
        screen.getByText(/Expédition prise en charge/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Lettre suivie/)).toBeInTheDocument();
    });
  });

  describe("ReferencePrices", () => {
    it("identifies presence of reference prices and renders external prices", () => {
      const mockPricing = {
        cardmarket: { trend: 12.5 },
        tcgplayer: { normal: { marketPrice: 15.0 } },
      };

      expect(hasReferencePrices(mockPricing as any)).toBe(true);
      expect(hasReferencePrices(null)).toBe(false);

      render(
        <ReferencePrices
          marketPricing={mockPricing as any}
          cardName="Charizard"
        />,
      );

      expect(screen.getByText("Prix de référence")).toBeInTheDocument();
      expect(screen.getByText("Cardmarket")).toBeInTheDocument();
      expect(screen.getByText("TCGplayer")).toBeInTheDocument();
    });
  });

  describe("AddToCollectionDialog", () => {
    it("opens dialog and triggers wishlist addition", async () => {
      const mockAuthValue: any = {
        user: { id: 1, email: "user@test.com" },
        isAuthenticated: true,
      };

      vi.mocked(collectionService.getMyCollections).mockResolvedValue([
        { id: "col-1", name: "Favorites" } as any,
      ]);
      vi.mocked(pokemonCardService.addToWishlist).mockResolvedValue({} as any);

      render(
        <AuthContext.Provider value={mockAuthValue}>
          <AddToCollectionDialog cardId="card-123" cardName="Mewtwo" />
        </AuthContext.Provider>,
      );

      const trigger = screen.getByRole("button");
      fireEvent.click(trigger);

      expect(await screen.findByText("Wishlist")).toBeInTheDocument();

      const wishlistBtn = screen.getByText("Wishlist");
      fireEvent.click(wishlistBtn);

      expect(pokemonCardService.addToWishlist).toHaveBeenCalledWith(
        1,
        "card-123",
      );
    });
  });
});
