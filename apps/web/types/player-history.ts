import type { Tournament } from "@/types/tournament";

export interface TournamentHistoryItem {
  tournament: Pick<
    Tournament,
    "id" | "name" | "startDate" | "endDate" | "location" | "type" | "status"
  >;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalPlayers: number;
  eloBefore: number;
  eloAfter: number;
  eloDelta: number;
}

export interface TournamentHistoryStats {
  totalTournaments: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalMatches: number;
  winRate: number;
  bestRank: number | null;
  totalPoints: number;
}

export interface TournamentHistoryResponse {
  playerId: number;
  period: string;
  baseElo: number;
  history: TournamentHistoryItem[];
  stats: TournamentHistoryStats;
}
