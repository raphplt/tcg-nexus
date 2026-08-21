import { useQuery } from "@tanstack/react-query";
import { tournamentService } from "@/services/tournament.service";
import { BracketStructure } from "@/types/tournament";

export function useBracket(tournamentId: string) {
  const id = parseInt(tournamentId);

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

  const getCurrentRound = () => {
    if (!bracket) return 1;

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

  const goToRound = (roundIndex: number) => {
    return getMatchByRound(roundIndex);
  };

  return {
    bracket,
    isLoading: bracketLoading,
    error: bracketError,

    currentRound: getCurrentRound(),
    totalMatches: getTotalMatches(),
    completedMatches: getCompletedMatches(),
    progressPercentage: getProgressPercentage(),

    getMatchByRound,
    goToRound,
    refetch: async () => {
      await refetchBracket();
    },

    isSwiss: bracket?.type === "swiss_system",
    isRoundRobin: bracket?.type === "round_robin",
    // The two elimination formats are drawn by different components: a double
    // elimination bracket has a losers branch and a grand final to show.
    isSingleElimination: bracket?.type === "single_elimination",
    isDoubleElimination: bracket?.type === "double_elimination",
  };
}
