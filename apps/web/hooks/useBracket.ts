import { useQuery } from "@tanstack/react-query";
import { tournamentService } from "@/services/tournament.service";
import { BracketStructure, SwissPairing, Match } from "@/types/tournament";

export function useBracket(tournamentId: string) {
  const id = parseInt(tournamentId);

  // Bracket data
  const {
    data: bracket,
    isLoading: bracketLoading,
    error: bracketError,
  } = useQuery<BracketStructure>({
    queryKey: ["tournament", tournamentId, "bracket"],
    queryFn: () => tournamentService.getBracket(id),
    enabled: !!id,
  });

  // Pairings pour Swiss/Round Robin
  const {
    data: pairings,
    isLoading: pairingsLoading,
    error: pairingsError,
  } = useQuery<SwissPairing | Match[]>({
    queryKey: ["tournament", tournamentId, "pairings"],
    queryFn: () => tournamentService.getPairings(id),
    enabled:
      !!id &&
      (bracket?.type === "swiss_system" || bracket?.type === "round_robin"),
  });

  // Helper functions
  const getCurrentRound = () => {
    if (!bracket) return 1;

    // Trouver le round avec des matches en cours ou non terminés
    for (const round of bracket.rounds) {
      const hasActiveMatches = round.matches.some(
        (match) => !match.winnerId && (match.playerA || match.playerB),
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
          total + round.matches.filter((match) => match.winnerId).length,
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
    pairings,
    isLoading: bracketLoading || pairingsLoading,
    error: bracketError || pairingsError,

    // Computed values
    currentRound: getCurrentRound(),
    totalMatches: getTotalMatches(),
    completedMatches: getCompletedMatches(),
    progressPercentage: getProgressPercentage(),

    // Helpers
    getMatchByRound,
    goToRound,

    // Swiss specific
    isSwiss: bracket?.type === "swiss_system",
    isRoundRobin: bracket?.type === "round_robin",
    isElimination:
      bracket?.type === "single_elimination" ||
      bracket?.type === "double_elimination",
  };
}
