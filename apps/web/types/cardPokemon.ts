import { EnergyType } from "./enums/energyType";
import { PokemonCardsType } from "./enums/pokemonCardsType";
import { TrainerType } from "./enums/trainerType";

export type PokemonSetType = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  tcgOnline?: boolean;
  releaseDate?: string;
  cardCount?: number;
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
  rarity?: string;
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
