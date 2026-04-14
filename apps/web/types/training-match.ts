import {
  EligibleDeckSummary,
  OnlineMatchLogEntry,
  SanitizedGameState,
} from "@/types/match-online";

export type TrainingDifficulty = "easy" | "standard";
export type TrainingSessionStatus = "ACTIVE" | "FINISHED";
export type TrainingMatchWinnerSide = "PLAYER" | "AI";

export interface TrainingAiDeckPreset {
  id: string;
  name: string;
  cardCount: number;
}

export interface TrainingSessionSummary {
  sessionId: number;
  status: TrainingSessionStatus;
  aiDeckPresetId: string;
  aiDeckPresetName: string;
  aiDifficulty: TrainingDifficulty;
  turnNumber: number;
  awaitingPlayerAction: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface TrainingLobbyView {
  availableDecks: EligibleDeckSummary[];
  aiDeckPresets: TrainingAiDeckPreset[];
  difficulties: TrainingDifficulty[];
  activeSessions: TrainingSessionSummary[];
}

export interface TrainingSessionView {
  sessionId: number;
  status: TrainingSessionStatus;
  playerDeckId: number;
  aiDeckPresetId: string;
  aiDeckPresetName: string;
  aiDifficulty: TrainingDifficulty;
  humanPlayerId: string;
  aiPlayerId: string;
  winnerSide: TrainingMatchWinnerSide | null;
  endedReason: string | null;
  gameState: SanitizedGameState | null;
  recentLog: OnlineMatchLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface TrainingActionResult {
  session: TrainingSessionView;
  events: Record<string, unknown>[];
}
