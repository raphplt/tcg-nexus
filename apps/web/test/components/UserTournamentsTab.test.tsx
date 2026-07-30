import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserTournamentsTab } from "@/app/(main)/users/[id]/_components/UserTournamentsTab";
import { playerService } from "@/services/player.service";

vi.mock("@/services/player.service", () => ({
  playerService: {
    getTournamentHistory: vi.fn(),
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

describe("UserTournamentsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Aucun tournoi' when playerId is undefined", () => {
    renderWithClient(<UserTournamentsTab playerId={undefined} />);
    expect(screen.getByText("Aucun tournoi")).toBeInTheDocument();
  });

  it("shows 'Aucun tournoi' when history is empty", async () => {
    (playerService.getTournamentHistory as any).mockResolvedValue({
      history: [],
      stats: {},
    });
    renderWithClient(<UserTournamentsTab playerId={12} />);
    await waitFor(() => {
      expect(screen.getByText("Aucun tournoi")).toBeInTheDocument();
    });
  });

  it("shows error state on query failure", async () => {
    (playerService.getTournamentHistory as any).mockRejectedValue(
      new Error("boom"),
    );
    renderWithClient(<UserTournamentsTab playerId={12} />);
    await waitFor(() => {
      expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
    });
  });

  it("renders tournament rows with rank and match count", async () => {
    (playerService.getTournamentHistory as any).mockResolvedValue({
      history: [
        {
          tournament: { id: 1, name: "Cup Alpha" },
          rank: 2,
          wins: 3,
          losses: 1,
          draws: 0,
        },
        {
          tournament: { id: 2, name: "Cup Beta" },
          rank: 5,
          wins: 2,
          losses: 3,
          draws: 1,
        },
      ],
      stats: {},
    });
    renderWithClient(<UserTournamentsTab playerId={12} />);
    await waitFor(() => {
      expect(screen.getByText("Cup Alpha")).toBeInTheDocument();
    });
    expect(screen.getByText("Cup Beta")).toBeInTheDocument();
    expect(screen.getByText(/2e place/)).toBeInTheDocument();
    expect(screen.getByText(/5e place/)).toBeInTheDocument();
    expect(screen.getByText(/4 match/)).toBeInTheDocument();
    expect(screen.getByText(/6 match/)).toBeInTheDocument();
  });
});
