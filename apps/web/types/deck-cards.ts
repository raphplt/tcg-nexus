import {DeckCardRole} from "@/types/enums/deckCardRole";
import {PokemonCardType} from "@/types/cardPokemon";

export interface DeckCards {
    id?: number;
    name: string;
    cardId?: string;
    qty: number;
    role: DeckCardRole;
    card?: PokemonCardType;
}