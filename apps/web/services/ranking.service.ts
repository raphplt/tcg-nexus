import { authedFetch, fetcher } from "@/utils/fetch";

export interface EloHistoryEntry {
  id: number;
  createdAt: string;
  delta: number;
  result: "win" | "loss" | "draw";
  opponentId: number | null;
  eloAfter: number;
}

export interface EloProfile {
  elo: number;
  history: EloHistoryEntry[];
}

export interface GlobalRankingPlayer {
  rank: number;
  userId: number;
  pseudo: string;
  avatarUrl: string | null;
  score: number;
  tendency: "up" | "down" | "equal";
}

export interface GlobalRankingResponse {
  data: GlobalRankingPlayer[];
  total: number;
  page: number;
  limit: number;
}

export const rankingService = {
  async getMyElo(): Promise<EloProfile> {
    return authedFetch<EloProfile>("GET", "/ranking/elo/me");
  },

  async getGlobalRanking(params: {
    page?: number;
    limit?: number;
    period?: string;
    format?: string;
  }): Promise<GlobalRankingResponse> {
    return fetcher<GlobalRankingResponse>("/ranking/global", { params });
  },

  async getMyRankingPosition(params: {
    period?: string;
    format?: string;
  }): Promise<GlobalRankingPlayer> {
    return authedFetch<GlobalRankingPlayer>("GET", "/ranking/me", { params });
  },
};
