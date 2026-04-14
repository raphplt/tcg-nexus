import {
  Match,
  ReportScoreDto,
  StartMatchDto,
  ResetMatchDto,
} from "@/types/tournament";
import { PlayHubResponse } from "@/types/play-hub";
import { authedFetch, fetcher } from "@/utils/fetch";

export const matchService = {
  async getPlayHub(): Promise<PlayHubResponse> {
    return authedFetch<PlayHubResponse>("GET", "/matches/play-hub");
  },

  async getMatch(id: number): Promise<Match> {
    return fetcher<Match>(`/matches/${id}`);
  },

  async startMatch(id: number, data?: StartMatchDto): Promise<Match> {
    return authedFetch<Match>("POST", `/matches/${id}/start`, {
      data: data || {},
    });
  },

  async reportScore(id: number, score: ReportScoreDto): Promise<Match> {
    return authedFetch<Match>("POST", `/matches/${id}/report-score`, {
      data: score,
    });
  },

  async resetMatch(id: number, data: ResetMatchDto): Promise<Match> {
    return authedFetch<Match>("POST", `/matches/${id}/reset`, {
      data,
    });
  },

  async getMatchesByRound(
    tournamentId: number,
    round: number,
  ): Promise<Match[]> {
    return fetcher<Match[]>(
      `/matches/tournament/${tournamentId}/round/${round}`,
    );
  },

  async getPlayerMatches(
    playerId: number,
    tournamentId: number,
  ): Promise<Match[]> {
    return fetcher<Match[]>(
      `/matches/player/${playerId}/tournament/${tournamentId}`,
    );
  },

  // ============= MATCH FILTERING =============

  async getMatches(filters?: {
    tournamentId?: number;
    round?: number;
    phase?: string;
    status?: string;
    playerId?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    matches: Match[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return fetcher("/matches", { params: filters });
  },
};
