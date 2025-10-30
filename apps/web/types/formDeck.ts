import { DeckCard } from "@/types/deck-cards";

export interface FormatOption {
  id: number;
  type: string;
}

export interface DeckFormProps {
  formats: FormatOption[];
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
  formatId: string;
  isPublic: boolean;
}>;
