import { EnergyType } from "./enums/energyType";
import { PokemonCardsType } from "./enums/pokemonCardsType";
import { TrainerType } from "./enums/trainerType";
import { Rarity } from "./listing";

// TCGPlayer pricing for a single variant (normal, holofoil, reverseHolofoil, etc.)
export interface TcgPlayerVariantPricing {
  productId: number;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
}

// TCGPlayer pricing container
export interface TcgPlayerPricing {
  unit: string;
  updated: string;
  normal?: TcgPlayerVariantPricing;
  holofoil?: TcgPlayerVariantPricing;
  reverseHolofoil?: TcgPlayerVariantPricing;
  "1stEditionHolofoil"?: TcgPlayerVariantPricing;
  "1stEditionNormal"?: TcgPlayerVariantPricing;
}

// CardMarket pricing container
export interface CardMarketPricing {
  unit: string;
  updated: string;
  idProduct: number;
  avg: number | null;
  avg1: number | null;
  avg7: number | null;
  avg30: number | null;
  low: number | null;
  trend: number | null;
  "avg-holo": number | null;
  "avg1-holo": number | null;
  "avg7-holo": number | null;
  "avg30-holo": number | null;
  "low-holo": number | null;
  "trend-holo": number | null;
}

// Combined pricing from both sources
export interface CardPricing {
  tcgplayer?: TcgPlayerPricing | null;
  cardmarket?: CardMarketPricing | null;
}

export type PokemonSetType = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  tcgOnline?: string;
  releaseDate?: string;
  serie?: PokemonSerieType;
  cardCount?: {
    total: number;
    official: number;
    reverse: number;
    holo: number;
    firstEd: number;
  };
  legal?: {
    standard: boolean;
    expanded: boolean;
  };
};

export type PokemonSerieType = {
  id: string;
  name: string;
  logo?: string;
};

export type PokemonCardType = {
  id: string;
  tcgDexId?: string;
  localId?: string;
  name?: string;
  image?: string;
  category?: PokemonCardsType;
  illustrator?: string;
  rarity?: Rarity;
  variants?: {
    normal: boolean;
    reverse: boolean;
    holo: boolean;
    firstEdition: boolean;
    wPromo?: boolean;
  };
  variantsDetailed?: {
    type?: string;
    size?: string;
    foil?: string;
    stamp?: string;
    subtype?: string;
  }[];
  set: PokemonSetType;
  dexId?: number[];
  hp?: number;
  types?: string[];
  evolveFrom?: string;
  description?: string;
  level?: string;
  stage?: string;
  suffix?: string;
  item?: {
    name: string;
    effect: string;
  };
  abilities?: {
    type?: string;
    name?: string;
    effect?: string;
  }[];
  attacks?: {
    cost: string[];
    name: string;
    effect: string;
    damage?: number | string;
  }[];
  weaknesses?: {
    type: string;
    value: string;
  }[];
  resistances?: {
    type: string;
    value: string;
  }[];
  retreat?: number;
  regulationMark?: string;
  legal?: {
    standard: boolean;
    expanded: boolean;
  };
  updated?: string;
  effect?: string;
  trainerType?: TrainerType;
  energyType?: EnergyType;
  boosters?: {
    id?: string;
    name?: string;
  }[];
  pricing?: CardPricing;
};
