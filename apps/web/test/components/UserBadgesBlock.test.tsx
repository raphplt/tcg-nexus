import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserBadgesBlock } from "@/app/(main)/users/[id]/_components/UserBadgesBlock";
import { badgeService } from "@/services/badge.service";

vi.mock("@/services/badge.service", () => ({
  badgeService: {
    getUserBadges: vi.fn(),
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

describe("UserBadgesBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when the user has no badges", async () => {
    (badgeService.getUserBadges as any).mockResolvedValue([]);
    renderWithClient(<UserBadgesBlock userId={5} />);
    await waitFor(() => {
      expect(
        screen.getByText("Aucun badge débloqué pour le moment"),
      ).toBeInTheDocument();
    });
  });

  it("shows error message when the query fails", async () => {
    (badgeService.getUserBadges as any).mockRejectedValue(new Error("boom"));
    renderWithClient(<UserBadgesBlock userId={5} />);
    await waitFor(() => {
      expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
    });
  });

  it("renders a list of unlocked badges with name and date", async () => {
    (badgeService.getUserBadges as any).mockResolvedValue([
      {
        id: 1,
        unlockedAt: "2026-01-01T00:00:00Z",
        badge: {
          id: 10,
          code: "first_deck",
          name: "Premier deck",
          description: "Créer un deck",
          icon: "sparkles",
          category: "deck",
        },
      },
      {
        id: 2,
        unlockedAt: "2026-02-15T00:00:00Z",
        badge: {
          id: 11,
          code: "collector_10",
          name: "Collectionneur",
          description: "10 cartes",
          icon: "layers",
          category: "collection",
        },
      },
    ]);
    renderWithClient(<UserBadgesBlock userId={5} />);
    await waitFor(() => {
      expect(screen.getByText("Premier deck")).toBeInTheDocument();
    });
    expect(screen.getByText("Collectionneur")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
