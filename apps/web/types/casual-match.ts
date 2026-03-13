import type {
  EligibleDeckSummary,
  OnlineMatchLogEntry,
  SanitizedGameState,
} from "./match-online";

export type CasualMatchSessionStatus =
  | "WAITING_FOR_DECKS"
  | "ACTIVE"
  | "FINISHED"
  | "CANCELLED";

export type CasualMatchSlot = "playerA" | "playerB";

export interface CasualSessionSummary {
  sessionId: number;
  status: CasualMatchSessionStatus;
  opponentName: string;
  ownDeckSelected: boolean;
  turnNumber: number;
  awaitingPlayerAction: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface CasualLobbyView {
  availableDecks: EligibleDeckSummary[];
  activeSessions: CasualSessionSummary[];
  queueStatus: "idle" | "queued";
}

export interface CasualSessionView {
  sessionId: number;
  status: CasualMatchSessionStatus;
  slot: CasualMatchSlot;
  enginePlayerId: string;
  selectedDeckId: number | null;
  opponentDeckReady: boolean;
  opponentName: string;
  winnerUserId: number | null;
  endedReason: string | null;
  gameState: SanitizedGameState | null;
  recentLog: OnlineMatchLogEntry[];
}

export interface CasualActionResult {
  session: CasualSessionView;
  events: Record<string, unknown>[];
}
