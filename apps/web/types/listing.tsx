import { User } from "./auth";
import { PokemonCardType } from "./cardPokemon";

export interface Listing {
  id: number;
  seller: User;
  pokemonCard: PokemonCardType;
  price: number;
  currency: string;
  quantityAvailable: number;
  cardState: CardState;
  createdAt: Date;
  expiresAt: Date;
}

export enum CardState {
  NM = "NM",
  EX = "EX",
  GD = "GD",
  LP = "LP",
  PL = "PL",
  Poor = "Poor",
}