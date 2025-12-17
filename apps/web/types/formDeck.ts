import { DeckCard } from "@/types/deck-cards";
import { Deck } from "@/types/Decks";

export interface FormatOption {
  id: number;
  type: string;
}

export interface DeckFormProps {
  formats: FormatOption[];
  deck?: Deck;
}

export interface cardsArrayDel {
  id: number;
}

export type UpdateData = {
  cardsToAdd: any;
  cardsToRemove: cardsArrayDel[] | [];
  cardsToUpdate: DeckCard[] | [];
} & Partial<{
  deckName: string;
  formatId: number;
  isPublic: boolean;
}>;
