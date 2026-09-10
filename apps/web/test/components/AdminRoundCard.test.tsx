import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminRoundCard } from "@/app/[locale]/(main)/tournaments/[id]/admin/_components/AdminRoundCard";
import { Match } from "@/types/tournament";

describe("AdminRoundCard", () => {
  const mockMatches: Match[] = [
    {
      id: 101,
      tournament: {} as any,
      playerA: { id: 1, name: "Alice", user: { id: 1, email: "alice@test.com", firstName: "Alice", lastName: "L" } },
      playerB: { id: 2, name: "Bob", user: { id: 2, email: "bob@test.com", firstName: "Bob", lastName: "B" } },
      round: 1,
      phase: "quarter_final",
      status: "scheduled",
      playerAScore: 0,
      playerBScore: 0,
    },
    {
      id: 102,
      tournament: {} as any,
      playerA: { id: 3, name: "Charlie", user: { id: 3, email: "charlie@test.com", firstName: "Charlie", lastName: "C" } },
      playerB: undefined,
      round: 1,
      phase: "quarter_final",
      status: "scheduled",
      playerAScore: 0,
      playerBScore: 0,
    },
  ];

  it("renders round header, match list and TBD indicator", () => {
    render(
      <AdminRoundCard
        roundNumber={1}
        totalRounds={3}
        tournamentId={15}
        tournamentType="single_elimination"
        tournamentStatus="in_progress"
        currentRound={1}
        matches={mockMatches}
        onStartMatch={vi.fn()}
        onEditScore={vi.fn()}
      />,
    );

    // Quarter final title for round 1 of 3 (totalRounds - 2)
    expect(screen.getByText(/Quarts de finale/i)).toBeInTheDocument();
    expect(screen.getByText("Alice L")).toBeInTheDocument();
    expect(screen.getByText("Bob B")).toBeInTheDocument();
    expect(screen.getByText("Charlie C")).toBeInTheDocument();
    // TBD for player B in match 102
    expect(screen.getByText(/En attente du résultat précédent/i)).toBeInTheDocument();
  });

  it("triggers onStartMatch when clicking start button on ready match", () => {
    const handleStartMatch = vi.fn();
    render(
      <AdminRoundCard
        roundNumber={1}
        totalRounds={3}
        tournamentId={15}
        tournamentType="single_elimination"
        tournamentStatus="in_progress"
        currentRound={1}
        matches={mockMatches}
        onStartMatch={handleStartMatch}
        onEditScore={vi.fn()}
      />,
    );

    const startButtons = screen.getAllByRole("button", { name: /Démarrer/i });
    expect(startButtons.length).toBeGreaterThan(0);
    fireEvent.click(startButtons[0]!);
    expect(handleStartMatch).toHaveBeenCalledWith(mockMatches[0]);
  });

  it("triggers onEditScore when clicking score button", () => {
    const handleEditScore = vi.fn();
    render(
      <AdminRoundCard
        roundNumber={1}
        totalRounds={3}
        tournamentId={15}
        tournamentType="single_elimination"
        tournamentStatus="in_progress"
        currentRound={1}
        matches={mockMatches}
        onStartMatch={vi.fn()}
        onEditScore={handleEditScore}
      />,
    );

    const scoreButtons = screen.getAllByRole("button", { name: /Score/i });
    expect(scoreButtons.length).toBeGreaterThan(0);
    fireEvent.click(scoreButtons[0]!);
    expect(handleEditScore).toHaveBeenCalledWith(mockMatches[0]);
  });

  it("renders final title when round is the last round", () => {
    render(
      <AdminRoundCard
        roundNumber={3}
        totalRounds={3}
        tournamentId={15}
        tournamentType="single_elimination"
        tournamentStatus="in_progress"
        currentRound={1}
        matches={[]}
        onStartMatch={vi.fn()}
        onEditScore={vi.fn()}
      />,
    );

    expect(screen.getByText(/Finale/i)).toBeInTheDocument();
  });
});
