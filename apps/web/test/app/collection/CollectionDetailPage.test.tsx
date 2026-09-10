import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CollectionDetailPage from "@/app/[locale]/(main)/collection/[id]/page";
import type { Collection, CollectionItemType } from "@/types/collection";
import type { PaginatedResult } from "@/types/pagination";
import { SealedCondition, SealedProductType } from "@/types/sealed-product";
import { UserRole } from "@/types/auth";
import messages from "@/messages/en.json";
import { collectionService } from "@/services/collection.service";
import { navigationMocks } from "../../setup";

vi.unmock("next-intl");

const auth = vi.hoisted(() => ({ user: null as { id: number } | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/services/collection.service", () => ({
  collectionService: {
    getById: vi.fn(),
    getItemsPaginated: vi.fn(),
    getSetRarities: vi.fn(),
    addCardToCollection: vi.fn(),
    removeCardFromCollection: vi.fn(),
    getValuation: vi.fn(),
  },
}));

const card: CollectionItemType = {
  id: 1,
  quantity: 2,
  productKind: "card",
  pokemonCard: {
    id: "sv1-1",
    name: "Pikachu",
    set: { id: "sv1", name: "Scarlet" },
  },
};
const sealed: CollectionItemType = {
  id: 2,
  quantity: 1,
  productKind: "sealed",
  pokemonCard: null,
  sealedProduct: {
    id: "etb",
    name: "Trainer Box",
    image: "etb.png",
    productType: SealedProductType.ETB,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  sealedCondition: SealedCondition.BOX_DAMAGED,
};
const collection: Collection = {
  id: "1",
  name: "Mixed",
  isPublic: true,
  user: {
    id: 7,
    avatarUrl: "",
    email: "owner@example.test",
    firstName: "Owner",
    lastName: "Test",
    role: UserRole.USER,
    isPro: false,
    isActive: true,
    createdAt: new Date("2026-01-01"),
  },
  created_at: "2026-01-01",
  items: [card, sealed],
};
function page(data: CollectionItemType[]): PaginatedResult<CollectionItemType> {
  return {
    data,
    meta: {
      totalItems: data.length,
      itemCount: data.length,
      itemsPerPage: 12,
      totalPages: 1,
      currentPage: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <CollectionDetailPage />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  auth.user = null;
  navigationMocks.setParams({ id: "1" });
  vi.mocked(collectionService.getById).mockResolvedValue(collection);
  vi.mocked(collectionService.getItemsPaginated).mockResolvedValue(
    page([card, sealed]),
  );
  vi.mocked(collectionService.getValuation).mockResolvedValue(null as any);
});

describe("CollectionDetailPage", () => {
  it("renders public mixed inventory in both views without mutation controls or invented condition", async () => {
    mount();
    expect(await screen.findByText("Trainer Box")).toHaveAttribute(
      "href",
      "/marketplace/sealed/etb",
    );
    expect(screen.getByText("Damaged box")).toBeInTheDocument();
    expect(screen.getByText("Unknown condition")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add one copy" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Table view" }));
    expect(screen.getByText("Trainer Box")).toBeInTheDocument();
    expect(screen.getByText("Pikachu")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove one copy" }),
    ).not.toBeInTheDocument();
  });

  it("allows the owner to mutate cards without sending sealed identities to card endpoints", async () => {
    auth.user = { id: 7 };
    mount();
    await screen.findByText("Trainer Box");
    const add = screen.getAllByRole("button", { name: "Add one copy" });
    expect(add).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Add one copy" }));
    fireEvent.click(screen.getByRole("button", { name: "Add one copy" }));
    await waitFor(() =>
      expect(collectionService.addCardToCollection).toHaveBeenCalledTimes(1),
    );
    expect(collectionService.addCardToCollection).toHaveBeenCalledWith(
      "1",
      "sv1-1",
    );
  });

  it("offers retry after an item load failure instead of showing an empty success", async () => {
    vi.mocked(collectionService.getItemsPaginated).mockRejectedValueOnce(
      new Error("offline"),
    );
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.CollectionDetail.loadError,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Trainer Box")).toBeInTheDocument();
  });

  it("distinguishes inaccessible metadata from an empty collection", async () => {
    vi.mocked(collectionService.getById).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    });
    mount();
    expect(
      await screen.findByText("This collection is unavailable or private."),
    ).toBeInTheDocument();
    expect(collectionService.getItemsPaginated).not.toHaveBeenCalled();
  });

  it.each([
    { data: [card], name: "Pikachu" },
    { data: [sealed], name: "Trainer Box" },
    { data: [], name: messages.CollectionDetail.empty },
  ])("renders homogeneous and empty collections: $name", async ({
    data,
    name,
  }) => {
    vi.mocked(collectionService.getItemsPaginated).mockResolvedValueOnce(
      page(data),
    );
    mount();
    expect(await screen.findByText(name)).toBeInTheDocument();
  });

  it("renders collection valuation data safely when API returns authoritative DTO structure", async () => {
    vi.mocked(collectionService.getValuation).mockResolvedValueOnce({
      currency: "EUR",
      totalEstimatedValue: 125.5,
      totalCopiesCount: 10,
      valuedCopiesCount: 8,
      unvaluedCopiesCount: 2,
      coveragePercentage: 80,
      totalAcquisitionCost: 95.0,
      unrealizedGainLoss: 30.5,
      roiPercentage: 32.1,
      sources: ["Cardmarket (trend/avg)"],
      computedAt: "2026-09-10T12:00:00Z",
    });

    mount();
    expect(
      await screen.findByText(messages.CollectionDetail.valuationTitle),
    ).toBeInTheDocument();
    expect(screen.getByText("€125.50")).toBeInTheDocument();
    expect(screen.getByText(/Acquisition Cost:\s*€95\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\+€30\.50/)).toBeInTheDocument();
  });

  it("handles valuation without acquisition cost and without USD estimate without crashing", async () => {
    vi.mocked(collectionService.getValuation).mockResolvedValueOnce({
      currency: "EUR",
      totalEstimatedValue: 0,
      totalCopiesCount: 0,
      valuedCopiesCount: 0,
      unvaluedCopiesCount: 0,
      coveragePercentage: 0,
      totalAcquisitionCost: null,
      unrealizedGainLoss: null,
      roiPercentage: null,
      sources: ["Catalog reference"],
      computedAt: "2026-09-10T12:00:00Z",
    });

    mount();
    expect(
      await screen.findByText(messages.CollectionDetail.valuationTitle),
    ).toBeInTheDocument();
    expect(screen.getByText("€0.00")).toBeInTheDocument();
    expect(screen.queryByText("USD")).not.toBeInTheDocument();
  });
});
