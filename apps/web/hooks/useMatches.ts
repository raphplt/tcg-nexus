import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService } from "@/services/match.service";
import { tournamentService } from "@/services/tournament.service";
import {
  Match,
  ReportScoreDto,
  StartMatchDto,
  ResetMatchDto,
} from "@/types/tournament";
import { PaginatedResult } from "@/types/pagination";
import toast from "react-hot-toast";

export function useMatches(tournamentId: string) {
  const queryClient = useQueryClient();
  const id = parseInt(tournamentId);

  // Tous les matches du tournoi
  const {
    data: matchesData,
    isLoading,
    error,
  } = useQuery<PaginatedResult<Match>>({
    queryKey: ["tournament", tournamentId, "matches"],
    queryFn: () => tournamentService.getTournamentMatches(id),
    enabled: !!id,
  });

  // Mutations pour les actions sur les matches
  const startMatchMutation = useMutation({
    mutationFn: ({
      matchId,
      data,
    }: {
      matchId: number;
      data?: StartMatchDto;
    }) => matchService.startMatch(matchId, data),
    onSuccess: () => {
      toast.success("Match démarré !");
      queryClient.invalidateQueries({
        queryKey: ["tournament", tournamentId, "matches"],
      });
      queryClient.invalidateQueries({
        queryKey: ["tournament", tournamentId, "progress"],
      });
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.response?.data?.message || error.message}`);
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
    onSuccess: () => {
      toast.success("Score enregistré !");
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.response?.data?.message || error.message}`);
    },
  });

  const resetMatchMutation = useMutation({
    mutationFn: ({ matchId, data }: { matchId: number; data: ResetMatchDto }) =>
      matchService.resetMatch(matchId, data),
    onSuccess: () => {
      toast.success("Match réinitialisé");
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.response?.data?.message || error.message}`);
    },
  });

  // Helper functions
  const getMatchesByRound = (round: number) => {
    return (
      matchesData?.data?.filter((match: Match) => match.round === round) || []
    );
  };

  const getMatchesByStatus = (status: string) => {
    return (
      matchesData?.data?.filter((match: Match) => match.status === status) || []
    );
  };

  const getPlayerMatches = (playerId: number) => {
    return (
      matchesData?.data?.filter(
        (match: Match) =>
          match.playerA?.id === playerId || match.playerB?.id === playerId,
      ) || []
    );
  };

  const getMatchStats = () => {
    const matches = matchesData?.data || [];
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
    // Données
    matches: matchesData?.data || [],
    total: matchesData?.meta?.totalItems || 0,
    isLoading,
    error,

    // Actions
    startMatch: (matchId: number, data?: StartMatchDto) =>
      startMatchMutation.mutate({ matchId, data }),
    reportScore: (matchId: number, score: ReportScoreDto) =>
      reportScoreMutation.mutate({ matchId, score }),
    resetMatch: (matchId: number, data: ResetMatchDto) =>
      resetMatchMutation.mutate({ matchId, data }),

    // États des mutations
    isStarting: startMatchMutation.isPending,
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
