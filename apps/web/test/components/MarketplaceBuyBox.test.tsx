import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BuyBox } from "@/app/[locale]/(main)/marketplace/cards/[id]/_components/BuyBox";
import { ListingsTable } from "@/app/[locale]/(main)/marketplace/cards/[id]/_components/ListingsTable";
import { Currency } from "@/store/currency.store";
import { UserRole } from "@/types/auth";
import type { Listing } from "@/types/listing";
import { ProductKind } from "@/types/sealed-product";
import { CardState } from "@/utils/enums";

const ownListing: Listing = {
  id: 42,
  seller: {
    id: 7,
    email: "seller@example.com",
    firstName: "Test",
    lastName: "Seller",
    avatarUrl: "",
    role: UserRole.USER,
    isPro: false,
    isActive: true,
    createdAt: new Date(),
  },
  productKind: ProductKind.CARD,
  price: 3.17,
  currency: Currency.EUR,
  quantityAvailable: 1,
  shippingCost: 3.5,
  handlingTimeDays: 3,
  status: "active",
  cardState: CardState.NM,
  createdAt: new Date(),
  expiresAt: new Date(),
};

describe("BuyBox", () => {
  it("preserves the current card when linking to listing creation", () => {
    const cardId = "67c3850f-0226-4c99-b12a-a2ee5095eb94";

    render(
      <BuyBox
        cardId={cardId}
        totalListings={0}
        minPrice={null}
        avgPrice={null}
        maxPrice={null}
        currency={null}
        bestListing={null}
        isGoodDeal={false}
        loading={false}
        onAddToCart={vi.fn()}
        isAdding={false}
        isCartLoading={false}
      />,
    );

    expect(
      screen.getByRole("link", { name: /mettre cette carte en vente/i }),
    ).toHaveAttribute("href", `/marketplace/create?cardId=${cardId}`);
  });

  it("disables cart addition when the best listing belongs to the user", () => {
    render(
      <BuyBox
        cardId="67c3850f-0226-4c99-b12a-a2ee5095eb94"
        currentUserId={ownListing.seller.id}
        totalListings={1}
        minPrice={ownListing.price}
        avgPrice={ownListing.price}
        maxPrice={ownListing.price}
        currency={ownListing.currency}
        bestListing={ownListing}
        isGoodDeal={false}
        loading={false}
        onAddToCart={vi.fn()}
        isAdding={false}
        isCartLoading={false}
      />,
    );

    expect(screen.getByRole("button", { name: /votre offre/i })).toBeDisabled();
  });
});

describe("ListingsTable", () => {
  it("disables cart addition for the user's own listing", () => {
    render(
      <ListingsTable
        cardId="67c3850f-0226-4c99-b12a-a2ee5095eb94"
        currentUserId={ownListing.seller.id}
        listings={[ownListing]}
        loading={false}
        currencyFilter="all"
        setCurrencyFilter={vi.fn()}
        cardStateFilter="all"
        setCardStateFilter={vi.fn()}
        onAddToCart={vi.fn()}
        addingToListingId={null}
        isCartLoading={false}
      />,
    );

    expect(screen.getByRole("button", { name: /votre offre/i })).toBeDisabled();
  });
});
