import { authedFetch } from "@/utils/fetch";

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

export const rankingService = {
  async getMyElo(): Promise<EloProfile> {
    return authedFetch<EloProfile>("GET", "/ranking/elo/me");
  },
};
