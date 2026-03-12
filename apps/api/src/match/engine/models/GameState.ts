import { TrainerCardInGame } from "./Card";
import { GameFinishedReason, TurnStep, GamePhase } from "./enums";
import { PlayerState } from "./Player";
import { PendingPrompt } from "./Prompt";
import { SetupState } from "./Setup";
import { AnyEffect } from "../effects/Effect";

export interface GameState {
  id: string; // Match ID

  players: Record<string, PlayerState>;
  playerIds: [string, string]; // Ordered list of players

  // Turn info
  activePlayerId: string;
  firstPlayerId: string | null;
  turnNumber: number;
  gamePhase: GamePhase;
  turnStep: TurnStep;
  rngState: number;
  pendingTurnTransitionToPlayerId: string | null;

  // Game modifiers / Environment
  stadium: TrainerCardInGame | null;
  pendingPrompt: PendingPrompt | null;
  setup: SetupState | null;
  resumeAction: "AFTER_ATTACK_PROMOTION" | "AFTER_CHECKUP_PROMOTION" | null;
  pendingTrainerPlay: {
    playerId: string;
    trainerCardInstanceId: string;
    effects: AnyEffect[];
  } | null;

  // Result
  winnerId: string | null;
  winnerReason: GameFinishedReason | null;
}
