import type { PokemonCardType } from "../types/cardPokemon";

export interface Collection {
  id: number;
  name: string;
  description: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  userId: number;
}
  
  export interface CollectionItemType {
  id: number;
  quantity: number;
  pokemonCard: PokemonCardType;
  collectionId: number;
  cardState: {
    id: number;
    name: string;
  }
};