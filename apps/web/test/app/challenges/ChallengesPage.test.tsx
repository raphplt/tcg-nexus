import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChallengesPage from "@/app/[locale]/(main)/challenges/page";
import messages from "@/messages/en.json";
import {
  challengeService,
  type ActiveChallengeData,
  type ChallengeResponse,
} from "@/services/challenge.service";

vi.unmock("next-intl");

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, email: "trainer@tcgnexus.com" },
    isAuthenticated: true,
  }),
}));

vi.mock("@/services/challenge.service", () => ({
  challengeService: {
    getActiveChallenges: vi.fn(),
    claimChallenge: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ChallengesPage (integration)", () => {
  const mockGetActive = vi.mocked(challengeService.getActiveChallenges);
  const mockClaim = vi.mocked(challengeService.claimChallenge);

  const sampleChallenges: ChallengeResponse = {
    daily: [
      {
        id: 101,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        progress: 1,
        isCompleted: false,
        isClaimed: false,
        challenge: {
          id: 1,
          title: "Win 3 Matches",
          description: "Win 3 matches in casual or tournament play.",
          type: "DAILY",
          actionType: "WIN_MATCH",
          targetValue: 3,
          rewardXp: 150,
        },
      },
      {
        id: 102,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        progress: 1,
        isCompleted: true,
        isClaimed: false,
        challenge: {
          id: 2,
          title: "Open a Booster",
          description: "Simulate a booster opening in the mini-games section.",
          type: "DAILY",
          actionType: "OPEN_BOOSTER",
          targetValue: 1,
          rewardXp: 50,
        },
      },
    ],
    weekly: [
      {
        id: 201,
        expiresAt: new Date(Date.now() + 604800000).toISOString(),
        progress: 5,
        isCompleted: false,
        isClaimed: false,
        challenge: {
          id: 3,
          title: "Collect 10 Rare Cards",
          description: "Add 10 holo or secret rare cards to your collection.",
          type: "WEEKLY",
          actionType: "ADD_CARD",
          targetValue: 10,
          rewardXp: 500,
        },
      },
    ],
  };

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
  });

  it("renders page title and section headings", async () => {
    mockGetActive.mockResolvedValue(sampleChallenges);

    render(<ChallengesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Challenges",
      );
    });

    expect(
      screen.getByRole("heading", { name: "Daily quests" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Weekly quests" }),
    ).toBeInTheDocument();
  });

  it("renders challenge cards with titles, progress, and XP rewards", async () => {
    mockGetActive.mockResolvedValue(sampleChallenges);

    render(<ChallengesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Win 3 Matches")).toBeInTheDocument();
    });

    expect(screen.getByText("Open a Booster")).toBeInTheDocument();
    expect(screen.getByText("Collect 10 Rare Cards")).toBeInTheDocument();

    expect(screen.getByText("150 XP")).toBeInTheDocument();
    expect(screen.getByText("50 XP")).toBeInTheDocument();
    expect(screen.getByText("500 XP")).toBeInTheDocument();

    // Incomplete daily challenge: 1 / 3
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    // Completed daily challenge has claim button
    expect(
      screen.getByRole("button", { name: /Claim Reward !/i }),
    ).toBeInTheDocument();
  });

  it("claims a completed challenge when user clicks Claim button", async () => {
    mockGetActive.mockResolvedValue(sampleChallenges);
    mockClaim.mockResolvedValue({
      success: true,
      reward: 50,
      newTotalXp: 350,
    });

    render(<ChallengesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Claim Reward !/i }),
      ).toBeInTheDocument();
    });

    const claimButton = screen.getByRole("button", { name: /Claim Reward !/i });
    fireEvent.click(claimButton);

    await waitFor(() => {
      expect(mockClaim).toHaveBeenCalledWith(102);
    });

    await waitFor(() => {
      expect(screen.getByText("Reward Claimed")).toBeInTheDocument();
    });
  });

  it("renders empty state messages when no challenges are available", async () => {
    mockGetActive.mockResolvedValue({
      daily: [],
      weekly: [],
    });

    render(<ChallengesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("No daily challenges available right now."),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("No weekly challenges available right now."),
    ).toBeInTheDocument();
  });

  it("renders error state when challenge query fails", async () => {
    mockGetActive.mockRejectedValue(new Error("Network disconnect"));

    render(<ChallengesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("Could not load the challenges."),
      ).toBeInTheDocument();
    });
  });
});
