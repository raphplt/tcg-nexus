import { CardCategory, SpecialCondition } from "./enums";
import { AnyEffect } from "../effects/Effect";

export interface TcgDexCardBase {
  id: string;
  name: string;
  category: CardCategory;
  image?: string;
  // Others properties exist but we only list what we strictly need for the engine typing right now
}

export interface Attack {
  name: string;
  cost: string[];
  damage?: number | string; // Sometimes damage is a string like '30+' or '10x'
  effect?: string;
  effects?: AnyEffect[];
  ignoreResistance?: boolean;
}

export interface TcgDexPokemon extends TcgDexCardBase {
  category: CardCategory.Pokemon;
  types: string[];
  hp: number;
  stage: string;
  suffix?: string;
  evolvesFrom?: string;
  attacks: Attack[];
  weaknesses?: { type: string; value: string }[];
  resistances?: { type: string; value: string }[];
  retreat?: number;
  prizeCards?: number;
}

export interface TcgDexTrainer extends TcgDexCardBase {
  category: CardCategory.Trainer;
  trainerType: string; // Item, Supporter, Stadium, Tool
  effect: string;
  playEffects?: AnyEffect[];
  targetStrategy?: "OWN_POKEMON";
}

export interface TcgDexEnergy extends TcgDexCardBase {
  category: CardCategory.Energy;
  energyType: string; // Basic, Special
  effect?: string;
  provides: string[];
  isSpecial?: boolean;
}

export type TcgDexCard = TcgDexPokemon | TcgDexTrainer | TcgDexEnergy;

/**
 * Represents a specific physical card during a game instance.
 * Contains runtime state.
 */
export interface CardInGame<T extends TcgDexCardBase = TcgDexCard> {
  /** Unique identifier for this instance of the card in the game (UUID) */
  instanceId: string;
  /** The owner of the card (PlayerId) */
  ownerId: string;
  /** The raw card data from TCGDex or DB */
  baseCard: T;
}

export interface EnergyCardInGame extends CardInGame<TcgDexEnergy> {}
export interface TrainerCardInGame extends CardInGame<TcgDexTrainer> {}

/** Temporary effect applied to a Pokemon (expires at a turn boundary) */
export interface TemporaryEffect {
  type:
    | "PREVENT_DAMAGE"
    | "REDUCE_DAMAGE"
    | "CANT_ATTACK"
    | "CANT_RETREAT"
    | "BOOST_DAMAGE"
    | "CANT_USE_SAME_ATTACK";
  amount?: number;
  attackName?: string; // For CANT_USE_SAME_ATTACK
  expiresAt: { turnNumber: number; playerId: string };
}

/** Runtime state for a Pokemon on the board */
export interface PokemonCardInGame extends CardInGame<TcgDexPokemon> {
  damageCounters: number; // 10 = 1 counter, usually we just store total damage (e.g. 30)
  specialConditions: SpecialCondition[];
  attachedEnergies: EnergyCardInGame[];
  attachedTools: TrainerCardInGame[];
  // If evolved, this list contains the pre-evolutions underneath
  attachedEvolutions: PokemonCardInGame[];
  turnsInPlay: number; // To track if it can evolve this turn
  temporaryEffects: TemporaryEffect[];
}
