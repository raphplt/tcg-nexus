export interface PlayHubMatchSummary {
  id: number;
  tournamentId: number;
  tournamentName: string;
  opponentName: string;
  round: number;
  phase: string;
  status: "scheduled" | "in_progress" | "finished" | "forfeit" | "cancelled";
  scheduledDate?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  playerAScore: number;
  playerBScore: number;
  onlineSessionStatus?: string | null;
}

export interface PlayHubDeckSummary {
  id: number;
  name: string;
  format: string | null;
  updatedAt: string;
  coverCard?: {
    id: string;
    name?: string | null;
    image?: string | null;
  } | null;
}

export interface PlayHubResponse {
  playerId: number | null;
  ranked: {
    enabled: boolean;
    status: "coming_soon";
  };
  summary: {
    liveMatches: number;
    readyMatches: number;
    completedMatches: number;
    totalMatches: number;
    totalDecks: number;
  };
  matches: PlayHubMatchSummary[];
  recentDecks: PlayHubDeckSummary[];
}
