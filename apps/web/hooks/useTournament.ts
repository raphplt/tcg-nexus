import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tournamentService } from "@/services/tournament.service";
import { Tournament, StartTournamentOptions } from "@/types/tournament";
import toast from "react-hot-toast";

export function useTournament(id: string) {
  const queryClient = useQueryClient();
  const tournamentId = parseInt(id);

  // Données du tournoi
  const {
    data: tournament,
    isLoading,
    error,
    refetch,
  } = useQuery<Tournament>({
    queryKey: ["tournament", id],
    queryFn: () => tournamentService.getById(id),
    enabled: !!id,
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["tournament", id, "progress"],
    queryFn: () => tournamentService.getProgress(tournamentId),
    enabled: !!tournamentId,
    refetchInterval: tournament?.status === "in_progress" ? 30000 : false,
  });

  const { data: transitions } = useQuery({
    queryKey: ["tournament", id, "transitions"],
    queryFn: () => tournamentService.getAvailableTransitions(tournamentId),
    enabled: !!tournamentId,
  });

  const startMutation = useMutation({
    mutationFn: (options?: StartTournamentOptions) =>
      tournamentService.startTournament(tournamentId, options),
    onSuccess: () => {
      toast.success("Tournoi démarré avec succès !");
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.response?.data?.message || error.message}`);
    },
  });

  const finishMutation = useMutation({
    mutationFn: () => tournamentService.finishTournament(tournamentId),
    onSuccess: () => {
      toast.success("Tournoi terminé avec succès !");
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.response?.data?.message || error.message}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) =>
      tournamentService.cancelTournament(tournamentId, reason),
    onSuccess: () => {
      toast.success("Tournoi annulé");
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.response?.data?.message || error.message}`);
    },
  });

  const advanceRoundMutation = useMutation({
    mutationFn: () => tournamentService.advanceRound(tournamentId),
    onSuccess: (data) => {
      toast.success(
        `Round ${data.newRound} démarré ! ${data.matchesCreated} nouveaux matches créés.`,
      );
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.response?.data?.message || error.message}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      tournamentService.updateStatus(tournamentId, status),
    onSuccess: () => {
      toast.success("Statut mis à jour !");
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.response?.data?.message || error.message}`);
    },
  });

  return {
    // Données
    tournament,
    progress,
    transitions,
    isLoading: isLoading || progressLoading,
    error,

    // Actions
    startTournament: startMutation.mutate,
    finishTournament: finishMutation.mutate,
    cancelTournament: cancelMutation.mutate,
    advanceRound: advanceRoundMutation.mutate,
    updateStatus: updateStatusMutation.mutate,

    // États des mutations
    isStarting: startMutation.isPending,
    isFinishing: finishMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isAdvancing: advanceRoundMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,

    // Utils
    refetch,
    canStart: transitions?.availableTransitions.includes("in_progress"),
    canFinish: transitions?.availableTransitions.includes("finished"),
    canCancel: transitions?.availableTransitions.includes("cancelled"),
  };
}
