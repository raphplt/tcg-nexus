import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService } from "@/services/match.service";
import { tournamentService } from "@/services/tournament.service";
import {
  Match,
  ReportScoreDto,
  StartMatchDto,
  ResetMatchDto,
} from "@/types/tournament";
import { extractApiErrorMessage } from "@/utils/api-error";
import toast from "react-hot-toast";

export function useMatches(tournamentId: string) {
  const queryClient = useQueryClient();
  const id = parseInt(tournamentId);
  const refreshMatchQueries = () =>
    queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });

  const {
    data: matchesData,
    isLoading,
    error,
  } = useQuery<Match[]>({
    queryKey: ["tournament", tournamentId, "matches"],
    queryFn: () => tournamentService.getTournamentMatches(id),
    enabled: !!id,
  });

  const startMatchMutation = useMutation({
    mutationFn: ({
      matchId,
      data,
    }: {
      matchId: number;
      data?: StartMatchDto;
    }) => matchService.startMatch(matchId, data),
    onSuccess: async () => {
      toast.success("Match démarré !");
      await refreshMatchQueries();
    },
    onError: (error: unknown) => {
      toast.error(
        extractApiErrorMessage(error, "Impossible de démarrer ce match."),
      );
    },
  });

  const startMatchesMutation = useMutation({
    mutationFn: (matchIds: number[]) =>
      tournamentService.startMatchesInBulk(id, matchIds),
    onSuccess: async (result) => {
      toast.success(`${result.startedCount} match(s) démarré(s).`);
      await refreshMatchQueries();
    },
    onError: (error: unknown) => {
      toast.error(
        extractApiErrorMessage(
          error,
          "Les matches n'ont pas pu être démarrés.",
        ),
      );
    },
  });

  const reportScoreMutation = useMutation({
    mutationFn: ({
      matchId,
      score,
    }: {
      matchId: number;
      score: ReportScoreDto;
    }) => matchService.reportScore(matchId, score),
    onSuccess: async () => {
      toast.success("Score enregistré !");
      await refreshMatchQueries();
    },
    onError: (error: unknown) => {
      toast.error(
        extractApiErrorMessage(error, "Impossible d'enregistrer le score."),
      );
    },
  });

  const resetMatchMutation = useMutation({
    mutationFn: ({ matchId, data }: { matchId: number; data: ResetMatchDto }) =>
      matchService.resetMatch(matchId, data),
    onSuccess: async () => {
      toast.success("Match réinitialisé");
      await refreshMatchQueries();
    },
    onError: (error: unknown) => {
      toast.error(
        extractApiErrorMessage(error, "Impossible de réinitialiser le match."),
      );
    },
  });

  // Helper functions
  const getMatchesByRound = (round: number) => {
    return matchesData?.filter((match: Match) => match.round === round) || [];
  };

  const getMatchesByStatus = (status: string) => {
    return matchesData?.filter((match: Match) => match.status === status) || [];
  };

  const getPlayerMatches = (playerId: number) => {
    return (
      matchesData?.filter(
        (match: Match) =>
          match.playerA?.id === playerId || match.playerB?.id === playerId,
      ) || []
    );
  };

  const getMatchStats = () => {
    const matches = matchesData || [];
    return {
      total: matches.length,
      scheduled: matches.filter((m: Match) => m.status === "scheduled").length,
      inProgress: matches.filter((m: Match) => m.status === "in_progress")
        .length,
      finished: matches.filter((m: Match) => m.status === "finished").length,
      forfeit: matches.filter((m: Match) => m.status === "forfeit").length,
    };
  };

  return {
    matches: matchesData || [],
    total: matchesData?.length || 0,
    isLoading,
    error,

    // Actions
    startMatch: (matchId: number, data?: StartMatchDto) =>
      startMatchMutation.mutate({ matchId, data }),
    startMatches: (matchIds: number[]) => startMatchesMutation.mutate(matchIds),
    reportScore: (matchId: number, score: ReportScoreDto) =>
      reportScoreMutation.mutate({ matchId, score }),
    resetMatch: (matchId: number, data: ResetMatchDto) =>
      resetMatchMutation.mutate({ matchId, data }),

    isStarting: startMatchMutation.isPending || startMatchesMutation.isPending,
    isReporting: reportScoreMutation.isPending,
    isResetting: resetMatchMutation.isPending,

    // Helpers
    getMatchesByRound,
    getMatchesByStatus,
    getPlayerMatches,
    getMatchStats,

    // Computed
    stats: getMatchStats(),
  };
}
