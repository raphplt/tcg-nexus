import { CardCategory, SpecialCondition } from './enums';

export interface TcgDexCardBase {
  id: string;
  name: string;
  category: CardCategory;
  // Others properties exist but we only list what we strictly need for the engine typing right now
}

export interface Attack {
  name: string;
  cost: string[];
  damage: number | string; // Sometimes damage is a string like '30+' or '10x'
  effect?: string;
}

export interface TcgDexPokemon extends TcgDexCardBase {
  category: CardCategory.Pokemon;
  types: string[];
  hp: number;
  stage: string;
  suffix?: string;
  attacks: Attack[];
  weaknesses?: { type: string; value: string }[];
  resistances?: { type: string; value: string }[];
  retreat?: number;
}

export interface TcgDexTrainer extends TcgDexCardBase {
  category: CardCategory.Trainer;
  trainerType: string; // Item, Supporter, Stadium, Tool
  effect: string;
}

export interface TcgDexEnergy extends TcgDexCardBase {
  category: CardCategory.Energy;
  energyType: string; // Basic, Special
  effect?: string;
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

/** Runtime state for a Pokemon on the board */
export interface PokemonCardInGame extends CardInGame<TcgDexPokemon> {
  damageCounters: number; // 10 = 1 counter, usually we just store total damage (e.g. 30)
  specialConditions: SpecialCondition[];
  attachedEnergies: EnergyCardInGame[];
  attachedTools: TrainerCardInGame[];
  // If evolved, this list contains the pre-evolutions underneath
  attachedEvolutions: PokemonCardInGame[];
  turnsInPlay: number; // To track if it can evolve this turn
}
