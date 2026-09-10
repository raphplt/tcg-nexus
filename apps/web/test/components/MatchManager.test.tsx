import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MatchManager } from "@/app/[locale]/(main)/tournaments/[id]/admin/_components/MatchManager";

vi.mock("@/services/tournament.service", () => {
  return {
    tournamentService: {
      getById: vi.fn().mockResolvedValue({
        id: 15,
        name: "Tournoi Démo",
        type: "single_elimination",
        status: "in_progress",
        totalRounds: 3,
        currentRound: 1,
        matches: [
          {
            id: 1,
            round: 1,
            phase: "quarter_final",
            status: "scheduled",
            playerA: { id: 10, name: "Joueur 1" },
            playerB: { id: 11, name: "Joueur 2" },
            playerAScore: 0,
            playerBScore: 0,
          },
          {
            id: 2,
            round: 2,
            phase: "semi_final",
            status: "scheduled",
            playerA: null,
            playerB: null,
            playerAScore: 0,
            playerBScore: 0,
          },
        ],
      }),
      updateMatch: vi.fn().mockResolvedValue({}),
      startMatchesInBulk: vi.fn().mockResolvedValue({ startedCount: 1 }),
    },
  };
});

vi.mock("@/hooks/useBracket", () => {
  return {
    useBracket: vi.fn(() => ({
      bracket: {
        type: "single_elimination",
        totalRounds: 3,
        rounds: [
          { index: 1, matches: [] },
          { index: 2, matches: [] },
          { index: 3, matches: [] },
        ],
      },
      isLoading: false,
      isSingleElimination: true,
      isDoubleElimination: false,
      isSwiss: false,
      isRoundRobin: false,
    })),
  };
});

describe("MatchManager", () => {
  it("renders view switcher buttons and rounds navigation", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MatchManager tournamentId={15} />
      </QueryClientProvider>,
    );

    // Verify view mode switcher buttons
    expect(await screen.findByRole("button", { name: /Vue par ronde/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Arbre \/ Bracket/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tableau complet/i })).toBeInTheDocument();

    // Verify round pills
    expect(screen.getByRole("button", { name: /Toutes les rondes/i })).toBeInTheDocument();
  });
});
