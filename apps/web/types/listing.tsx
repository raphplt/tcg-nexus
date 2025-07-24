import { User } from "./auth";
import { PokemonCardType } from "./cardPokemon";

export interface Listing {
  id: number;
  seller: User;
  pokemonCard: PokemonCardType;
  price: number;
  currency: string;
  quantityAvailable: number;
  cardState: string;
  createdAt: Date;
  expiresAt: Date;
}
