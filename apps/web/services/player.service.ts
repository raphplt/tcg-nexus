import { authedFetch } from "@/utils/fetch";
import type { TournamentHistoryResponse } from "@/types/player-history";

export const playerService = {
  async getTournamentHistory(
    playerId: number,
    period: "1m" | "3m" | "1y" | "all" = "all",
  ): Promise<TournamentHistoryResponse> {
    return authedFetch<TournamentHistoryResponse>(
      "GET",
      `/players/${playerId}/tournament-history`,
      { params: { period } },
    );
  },
};
