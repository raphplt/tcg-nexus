import { EnergyType } from "./enums/energyType";
import { PokemonCardsType } from "./enums/pokemonCardsType";
import { TrainerType } from "./enums/trainerType";
import { Rarity } from "./listing";

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
  pricing?: {
    cardmarket?: Record<string, any> | null;
    tcgplayer?: Record<string, any> | null;
  };
};
