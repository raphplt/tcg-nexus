import {
  EligibleDeckSummary,
  OnlineMatchLogEntry,
  SanitizedGameState,
} from "../online/online-match.types";
import {
  TrainingDifficulty,
  TrainingMatchSessionStatus,
  TrainingMatchWinnerSide,
} from "../entities/training-match-session.entity";

export const TRAINING_AI_PLAYER_ID = "training-ai";

export interface TrainingAiDeckPreset {
  id: string;
  name: string;
  cardCount: number;
}

export interface TrainingSessionSummary {
  sessionId: number;
  status: TrainingMatchSessionStatus;
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
  status: TrainingMatchSessionStatus;
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
