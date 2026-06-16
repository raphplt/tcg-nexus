// apps/web/test/components/UserPublicProfile.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UserPublicProfile from "@/app/(main)/users/[id]/_components/UserPublicProfile";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));

vi.mock("@/services/user.service", () => ({
  userService: {
    getPublicProfile: vi.fn().mockResolvedValue({
      id: 1,
      firstName: "Ash",
      lastName: "Ketchum",
      avatarUrl: null,
      createdAt: "2024-01-01T00:00:00Z",
      player: { id: 12, elo: 1500, level: 3, xp: 250 },
    }),
  },
}));

vi.mock("@/services/decks.service", () => ({
  decksService: {
    getPublicDecksByUser: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
  },
}));

vi.mock("@/services/badge.service", () => ({
  badgeService: { getUserBadges: vi.fn().mockResolvedValue([]) },
}));

vi.mock("@/services/marketplace.service", () => ({
  marketplaceService: {
    getSellerStatistics: vi.fn().mockResolvedValue({ totalSales: 0, avgOrderValue: 0 }),
  },
}));

vi.mock("@/services/player.service", () => ({
  playerService: {
    getTournamentHistory: vi.fn().mockResolvedValue({ history: [], stats: {} }),
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

describe("UserPublicProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header with user name and ELO when data loads", async () => {
    renderWithClient(<UserPublicProfile />);

    await waitFor(() => {
      expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    });
    expect(screen.getByText(/ELO 1500/)).toBeInTheDocument();
  });
});
