import type { PokemonCardType, PokemonSetType } from "../types/cardPokemon";
import { User } from "./auth";

export interface Collection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  user: User;
  created_at: string;
  updatedAt?: string;
  userId?: number;
  items: CollectionItemType[];
  masterSet?: PokemonSetType;
}

export interface CollectionItemType {
  id: number | null;
  quantity: number;
  pokemonCard: PokemonCardType;
  collectionId?: string | number;
  added_at?: string;
  cardState?: {
    id: number;
    name: string;
    code?: string;
  };
}
