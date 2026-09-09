import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RankingPage from "@/app/[locale]/(main)/ranking/page";
import messages from "@/messages/en.json";
import {
  rankingService,
  type GlobalRankingPlayer,
  type GlobalRankingResponse,
} from "@/services/ranking.service";
import { authedFetch } from "@/utils/fetch";

vi.unmock("next-intl");

const authMock = vi.hoisted(() => ({
  user: null as { id: number; email?: string } | null,
  isAuthenticated: false,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authMock,
}));

vi.mock("@/services/ranking.service", () => ({
  rankingService: {
    getGlobalRanking: vi.fn(),
    getMyRankingPosition: vi.fn(),
  },
}));

vi.mock("@/utils/fetch", () => ({
  authedFetch: vi.fn(),
}));

describe("RankingPage (integration)", () => {
  const mockGetGlobalRanking = vi.mocked(rankingService.getGlobalRanking);
  const mockGetMyRankingPosition = vi.mocked(
    rankingService.getMyRankingPosition,
  );
  const mockAuthedFetch = vi.mocked(authedFetch);

  const samplePlayers: GlobalRankingPlayer[] = [
    {
      rank: 1,
      userId: 101,
      pseudo: "Ash Ketchum",
      avatarUrl: null,
      score: 2100,
      tendency: "up",
    },
    {
      rank: 2,
      userId: 102,
      pseudo: "Gary Oak",
      avatarUrl: null,
      score: 2050,
      tendency: "down",
    },
    {
      rank: 3,
      userId: 103,
      pseudo: "Cynthia",
      avatarUrl: null,
      score: 2000,
      tendency: "equal",
    },
    {
      rank: 4,
      userId: 104,
      pseudo: "Red",
      avatarUrl: null,
      score: 1950,
      tendency: "up",
    },
    {
      rank: 5,
      userId: 105,
      pseudo: "Blue",
      avatarUrl: null,
      score: 1900,
      tendency: "equal",
    },
  ];

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.user = null;
    authMock.isAuthenticated = false;
    mockAuthedFetch.mockResolvedValue([]);
  });

  it("renders page header and hero badges", async () => {
    mockGetGlobalRanking.mockResolvedValue({
      data: samplePlayers,
      total: samplePlayers.length,
      page: 1,
      limit: 20,
    });

    render(<RankingPage />, { wrapper: createWrapper() });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Global player leaderboard",
    );
    expect(screen.getByText("Classement ELO")).toBeInTheDocument();
  });

  it("renders podium with top 3 players and ranking table for remaining players", async () => {
    mockGetGlobalRanking.mockResolvedValue({
      data: samplePlayers,
      total: samplePlayers.length,
      page: 1,
      limit: 20,
    });

    render(<RankingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    });

    // Top 3 on podium
    expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    expect(screen.getByText("Gary Oak")).toBeInTheDocument();
    expect(screen.getByText("Cynthia")).toBeInTheDocument();
    expect(screen.getByText("2100")).toBeInTheDocument();
    expect(screen.getByText("2050")).toBeInTheDocument();
    expect(screen.getByText("2000")).toBeInTheDocument();

    // 4th and 5th in table
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
  });

  it("allows switching time period and refetches ranking", async () => {
    mockGetGlobalRanking.mockResolvedValue({
      data: samplePlayers,
      total: samplePlayers.length,
      page: 1,
      limit: 20,
    });

    render(<RankingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    });

    const weekButton = screen.getByRole("button", { name: "Week" });
    fireEvent.click(weekButton);

    await waitFor(() => {
      expect(mockGetGlobalRanking).toHaveBeenCalledWith(
        expect.objectContaining({ period: "week" }),
      );
    });
  });

  it("displays sticky position card when user is authenticated and not in visible page", async () => {
    authMock.user = { id: 999 };
    authMock.isAuthenticated = true;

    mockGetGlobalRanking.mockResolvedValue({
      data: samplePlayers,
      total: 50,
      page: 1,
      limit: 20,
    });

    const myPosition: GlobalRankingPlayer = {
      rank: 42,
      userId: 999,
      pseudo: "TestUser",
      avatarUrl: null,
      score: 1450,
      tendency: "up",
    };
    mockGetMyRankingPosition.mockResolvedValue(myPosition);

    render(<RankingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGetMyRankingPosition).toHaveBeenCalled();
      expect(screen.getAllByText("Your position").length).toBeGreaterThan(0);
      expect(screen.getAllByText("#42").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/1450/).length).toBeGreaterThan(0);
    });
  });

  it("renders empty state message when no ranked players are found", async () => {
    mockGetGlobalRanking.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    render(<RankingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("No ranked player at the moment."),
      ).toBeInTheDocument();
    });
  });

  it("renders error state when ranking query fails", async () => {
    mockGetGlobalRanking.mockRejectedValue(new Error("Network failure"));

    render(<RankingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("Could not load the leaderboard."),
      ).toBeInTheDocument();
    });
  });
});
