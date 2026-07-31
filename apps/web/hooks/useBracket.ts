import { useQuery } from "@tanstack/react-query";
import { tournamentService } from "@/services/tournament.service";
import { BracketStructure } from "@/types/tournament";

export function useBracket(tournamentId: string) {
  const id = parseInt(tournamentId);

  // Bracket data
  const {
    data: bracket,
    isLoading: bracketLoading,
    error: bracketError,
    refetch: refetchBracket,
  } = useQuery<BracketStructure>({
    queryKey: ["tournament", tournamentId, "bracket"],
    queryFn: () => tournamentService.getBracket(id),
    enabled: !!id,
  });

  // Helper functions
  const getCurrentRound = () => {
    if (!bracket) return 1;

    // Trouver le round avec des matches en cours ou non terminés
    for (const round of bracket.rounds) {
      const hasActiveMatches = round.matches.some((match) =>
        ["scheduled", "in_progress"].includes(match.status ?? "scheduled"),
      );
      if (hasActiveMatches) return round.index;
    }

    return bracket.rounds.length;
  };

  const getMatchByRound = (roundIndex: number) => {
    return bracket?.rounds.find((r) => r.index === roundIndex)?.matches || [];
  };

  const getTotalMatches = () => {
    return (
      bracket?.rounds.reduce(
        (total, round) => total + round.matches.length,
        0,
      ) || 0
    );
  };

  const getCompletedMatches = () => {
    return (
      bracket?.rounds.reduce(
        (total, round) =>
          total +
          round.matches.filter((match) =>
            ["finished", "forfeit"].includes(match.status ?? ""),
          ).length,
        0,
      ) || 0
    );
  };

  const getProgressPercentage = () => {
    const total = getTotalMatches();
    const completed = getCompletedMatches();
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  // Navigation helpers
  const goToRound = (roundIndex: number) => {
    // Peut être utilisé pour naviguer vers un round spécifique
    return getMatchByRound(roundIndex);
  };

  return {
    // Données
    bracket,
    isLoading: bracketLoading,
    error: bracketError,

    // Computed values
    currentRound: getCurrentRound(),
    totalMatches: getTotalMatches(),
    completedMatches: getCompletedMatches(),
    progressPercentage: getProgressPercentage(),

    // Helpers
    getMatchByRound,
    goToRound,
    refetch: async () => {
      await refetchBracket();
    },

    // Swiss specific
    isSwiss: bracket?.type === "swiss_system",
    isRoundRobin: bracket?.type === "round_robin",
    isElimination:
      bracket?.type === "single_elimination" ||
      bracket?.type === "double_elimination",
  };
}
