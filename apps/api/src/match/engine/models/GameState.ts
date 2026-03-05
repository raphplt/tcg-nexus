import { TrainerCardInGame } from "./Card";
import { GamePhase, TurnStep } from "./enums";
import { PlayerState } from "./Player";

export interface GameState {
  id: string; // Match ID

  players: Record<string, PlayerState>;
  playerIds: [string, string]; // Ordered list of players

  // Turn info
  activePlayerId: string;
  turnNumber: number;
  gamePhase: GamePhase;
  turnStep: TurnStep;

  // Game modifiers / Environment
  stadium: TrainerCardInGame | null;

  // Result
  winnerId: string | null;
}
