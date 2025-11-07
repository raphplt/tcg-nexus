import type { PokemonCardType } from "../types/cardPokemon";
import { User } from "./auth";

export interface Collection {
  id: number;
  name: string;
  description: string;
  isPublic: boolean;
  user: User;
  created_at: string;
  updatedAt: string;
  userId: number;
  items: CollectionItemType[];
}

export interface CollectionItemType {
  id: number;
  quantity: number;
  pokemonCard: PokemonCardType;
  collectionId: number;
  cardState: {
    id: number;
    name: string;
  };
}
