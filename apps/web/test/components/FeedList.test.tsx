import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedList } from "@/app/(main)/(protected)/feed/_components/FeedList";
import { feedService } from "@/services/feed.service";

vi.mock("@/services/feed.service", () => ({
  feedService: {
    getFeed: vi.fn(),
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

describe("FeedList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when feed is empty", async () => {
    (feedService.getFeed as any).mockResolvedValue([]);
    renderWithClient(<FeedList />);

    await waitFor(() => {
      expect(screen.getByText("Aucune activité récente")).toBeInTheDocument();
    });
  });

  it("shows error state when service throws", async () => {
    (feedService.getFeed as any).mockRejectedValue(new Error("boom"));
    renderWithClient(<FeedList />);

    await waitFor(() => {
      expect(
        screen.getByText("Erreur de chargement du feed"),
      ).toBeInTheDocument();
    });
  });

  it("renders a deck_created feed item", async () => {
    (feedService.getFeed as any).mockResolvedValue([
      {
        type: "deck_created",
        createdAt: "2026-01-01T00:00:00Z",
        actor: {
          id: 1,
          firstName: "Alice",
          lastName: "Doe",
          avatarUrl: null,
        },
        deck: { id: 42, name: "Blaziken Deck", format: null },
      },
    ]);
    renderWithClient(<FeedList />);

    await waitFor(() => {
      expect(screen.getByText("Alice Doe")).toBeInTheDocument();
    });
    expect(screen.getByText("Blaziken Deck")).toBeInTheDocument();
    expect(screen.getByText("a publié un deck")).toBeInTheDocument();
  });

  it("renders a tournament_joined feed item", async () => {
    (feedService.getFeed as any).mockResolvedValue([
      {
        type: "tournament_joined",
        createdAt: "2026-01-01T00:00:00Z",
        actor: {
          id: 2,
          firstName: "Bob",
          lastName: "Smith",
          avatarUrl: null,
        },
        tournament: {
          id: 10,
          name: "Cup X",
          startDate: null,
          endDate: null,
        },
      },
    ]);
    renderWithClient(<FeedList />);

    await waitFor(() => {
      expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    });
    expect(screen.getByText("Cup X")).toBeInTheDocument();
    expect(screen.getByText("a rejoint un tournoi")).toBeInTheDocument();
  });
});
