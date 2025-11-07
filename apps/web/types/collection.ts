import type { PokemonCardType } from "../types/cardPokemon";

export interface Collection {
  id: number;
  name: string;
  description: string;
  isPublic: boolean;
  createdAt: string;
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
