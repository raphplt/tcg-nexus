import type { PokemonCardType } from "./cardPokemon";
import type { SealedProduct } from "./sealed-product";

/** Two-player mini-games served by the `/mini-game` WebSocket namespace. */
export type MiniGameType = "case_opening" | "juste_prix";

/** Booster styles of the Case Opening mini-game (see the API `booster.ts`). */
export type PackStyle = "standard" | "premium" | "chase";

export const PACK_STYLES: PackStyle[] = ["standard", "premium", "chase"];

/** Rarity tiers, from least to most desirable. Mirrors the API enum. */
export enum RarityTier {
  Common = 0,
  Uncommon = 1,
  Rare = 2,
  Holo = 3,
  Ultra = 4,
  Secret = 5,
}

/** A card drawn into a booster, tagged with the tier it was drawn from. */
export type BoosterCard = PokemonCardType & { rarityTier?: RarityTier };

/** Parameters sent when joining the matchmaking queue. */
export interface MiniGameQueueParams {
  setId?: string;
  serieId?: string;
  packStyle?: PackStyle;
  roundCount?: number;
}

export interface CaseOpeningPacksResponse {
  style: PackStyle;
  composition: Partial<Record<RarityTier, number>>[];
  /** `packs[round][player]`. */
  packs: BoosterCard[][][];
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
  openedPacks: BoosterCard[][];
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
  /** Options both players agreed on when queuing. */
  params: {
    setId: string | null;
    serieId: string | null;
    packStyle: PackStyle;
  };
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
