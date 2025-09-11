import { CardState } from "@/utils/enums";
import { User } from "./auth";
import { PokemonCardType } from "./cardPokemon";
import { DeckFormat } from "@/types/deckFormat";

export interface Decks {
  id: number;
  name: string;
  user: User;
  format: DeckFormat;
  createdAt: Date;
  updatedAt: Date;
}
