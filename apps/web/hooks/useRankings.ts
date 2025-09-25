import { useQuery } from "@tanstack/react-query";
import { tournamentService } from "@/services/tournament.service";
import { Ranking } from "@/types/tournament";

export function useRankings(tournamentId: string) {
  const id = parseInt(tournamentId);

  const {
    data: rankings,
    isLoading,
    error,
    refetch,
  } = useQuery<Ranking[]>({
    queryKey: ["tournament", tournamentId, "rankings"],
    queryFn: () => tournamentService.getRankings(id),
    enabled: !!id,
    refetchInterval: 60000, // Refresh toutes les minutes
  });

  // Helper functions
  const getPlayerRanking = (playerId: number) => {
    return rankings?.find((ranking) => ranking.player.id === playerId);
  };

  const getTopPlayers = (limit: number = 3) => {
    return rankings?.slice(0, limit) || [];
  };

  const getRankingStats = () => {
    if (!rankings) return null;

    const totalPoints = rankings.reduce((sum, r) => sum + r.points, 0);
    const totalMatches = rankings.reduce(
      (sum, r) => sum + r.wins + r.losses + r.draws,
      0,
    );
    const avgPoints = rankings.length > 0 ? totalPoints / rankings.length : 0;

    return {
      totalPlayers: rankings.length,
      totalPoints,
      totalMatches,
      avgPoints: Math.round(avgPoints * 100) / 100,
      perfectRecord: rankings.filter((r) => r.losses === 0 && r.wins > 0)
        .length,
    };
  };

  const getPlayerPosition = (playerId: number) => {
    const ranking = getPlayerRanking(playerId);
    return ranking?.rank || null;
  };

  const getRankingChanges = (previousRankings?: Ranking[]) => {
    if (!rankings || !previousRankings) return [];

    return rankings.map((current) => {
      const previous = previousRankings.find(
        (p) => p.player.id === current.player.id,
      );
      const change = previous ? previous.rank - current.rank : 0;

      return {
        playerId: current.player.id,
        currentRank: current.rank,
        previousRank: previous?.rank,
        change, // Positif = montée, négatif = descente
        isNew: !previous,
      };
    });
  };

  return {
    // Données
    rankings: rankings || [],
    isLoading,
    error,

    // Helpers
    getPlayerRanking,
    getTopPlayers,
    getPlayerPosition,
    getRankingChanges,

    // Stats
    stats: getRankingStats(),

    // Utils
    refetch,
    isEmpty: !rankings || rankings.length === 0,
  };
}
