import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserMarketplaceBlock } from "@/app/(main)/users/[id]/_components/UserMarketplaceBlock";
import { marketplaceService } from "@/services/marketplace.service";

vi.mock("@/services/marketplace.service", () => ({
  marketplaceService: {
    getSellerStatistics: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("UserMarketplaceBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error state when query fails", async () => {
    (marketplaceService.getSellerStatistics as any).mockRejectedValue(
      new Error("boom"),
    );
    renderWithClient(<UserMarketplaceBlock userId={5} />);
    await waitFor(() => {
      expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
    });
  });

  it("renders sales and avg order value when data loads", async () => {
    (marketplaceService.getSellerStatistics as any).mockResolvedValue({
      totalSales: 12,
      avgOrderValue: 24.5,
    });
    renderWithClient(<UserMarketplaceBlock userId={5} />);
    await waitFor(() => {
      expect(screen.getByText("12")).toBeInTheDocument();
    });
    expect(screen.getByText(/24\.50/)).toBeInTheDocument();
  });

  it("shows fallback '—' for missing avgOrderValue", async () => {
    (marketplaceService.getSellerStatistics as any).mockResolvedValue({
      totalSales: 0,
      avgOrderValue: null,
    });
    renderWithClient(<UserMarketplaceBlock userId={5} />);
    await waitFor(() => {
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });
});
