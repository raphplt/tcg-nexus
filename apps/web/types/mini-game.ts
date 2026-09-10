import type { PokemonCardType } from "./cardPokemon";
import type { SealedProduct } from "./sealed-product";

/** Two-player mini-games served by the `/mini-game` WebSocket namespace. */
export type MiniGameType = "case_opening" | "juste_prix";

/** Parameters sent when joining the matchmaking queue. */
export interface MiniGameQueueParams {
  setId?: string;
  roundCount?: number;
}

/** One Juste Prix round as served by `GET /mini-game/juste-prix/items`. */
export type JustePrixItem =
  | { type: "card"; id: string; price: number; data: PokemonCardType }
  | { type: "sealed"; id: string; price: number; data: SealedProduct };

/** A Juste Prix item as seen by an online player: no price attached. */
export type JustePrixPublicItem =
  | { type: "card"; id: string; data: PokemonCardType }
  | { type: "sealed"; id: string; data: SealedProduct };

export interface JustePrixItemsResponse {
  rules: {
    roundSeconds: number;
    maxAccuracyPoints: number;
    maxSpeedBonus: number;
  };
  items: JustePrixItem[];
}

/** A closed Juste Prix round for one player. */
export interface MiniGameRoundGuess {
  round: number;
  /** `null` when the round timed out before the player answered. */
  guess: number | null;
  elapsedSeconds: number;
  points: number;
}

export interface MiniGamePlayerState {
  userId: number;
  userName: string;
  score: number;
  ready: boolean;
  connected: boolean;
  hasGuessed: boolean;
  /** Only the rounds already revealed. */
  guesses: MiniGameRoundGuess[];
  /** Case Opening: boosters opened so far, cards with their pricing. */
  openedPacks: PokemonCardType[][];
}

export interface MiniGameSessionState {
  id: string;
  gameType: MiniGameType;
  round: number;
  maxRounds: number;
  state: "waiting" | "playing" | "finished";
  /** Server clock at the start of the current round. */
  roundStartedAt: number;
  /** Round length, `null` for games without a timer. */
  roundDurationMs: number | null;
  /** Server clock when this payload was built, to offset the local clock. */
  serverTime: number;
  /** Set when the duel ended because a player left. */
  forfeitedBy: number | null;
  players: MiniGamePlayerState[];
  currentItem: JustePrixPublicItem | null;
}

export interface MiniGameMatchedPayload {
  sessionId: string;
  gameType: MiniGameType;
  selfId: number;
  opponentId: number;
  opponentName: string;
  roundCount: number;
}

export interface JustePrixRoundReveal {
  round: number;
  correctPrice: number;
  guesses: {
    userId: number;
    userName: string;
    guess: number | null;
    points: number;
  }[];
}

export interface MiniGamePlayerConnectionPayload {
  userId: number;
  userName: string;
  connected: boolean;
  graceMs?: number;
}
