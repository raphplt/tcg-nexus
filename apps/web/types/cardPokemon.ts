import { EnergyType } from "./enums/energyType";
import { PokemonCardsType } from "./enums/pokemonCardsType";
import { TrainerType } from "./enums/trainerType";
import { Rarity } from "./listing";

export type PokemonSetType = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  tcgOnline?: boolean;
  releaseDate?: string;
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
  id: number;
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
  };
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
  attacks?: {
    cost: string[];
    name: string;
    effect: string;
    damage?: number;
  }[];
  weaknesses?: {
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
};
