import { AnyEffect } from "../effects/Effect";
import { TrainerCardInGame } from "./Card";
import { GameFinishedReason, GamePhase, TurnStep } from "./enums";
import { PlayerState } from "./Player";
import { PendingPrompt } from "./Prompt";
import { SetupState } from "./Setup";

/** Global game-level temporary effect (e.g. ABILITY_LOCK) */
export interface GlobalEffect {
  type: "ABILITY_LOCK";
  expiresAt: { turnNumber: number; playerId: string };
}

/** Context for an effect that requires user input via a prompt */
export interface PendingEffectAction {
  type: string;
  playerId: string;
  effect: AnyEffect;
}

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
  pendingEffectAction: PendingEffectAction | null;
  globalEffects: GlobalEffect[];

  // Result
  winnerId: string | null;
  winnerReason: GameFinishedReason | null;
}
