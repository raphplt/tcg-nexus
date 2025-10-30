import { DeckCardRole } from "@/types/enums/deckCardRole";
import { PokemonCardType } from "@/types/cardPokemon";
import { Deck } from "./Decks";

export interface DeckCard {
  id?: number;
  qty: number;
  deck: Deck;
  role: DeckCardRole;
  card?: PokemonCardType;
}
