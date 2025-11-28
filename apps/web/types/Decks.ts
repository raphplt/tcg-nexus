import { User } from "./auth";
import { DeckFormat } from "@/types/deckFormat";
import { DeckCard } from "@/types/deck-cards";

export interface Deck {
  id: number;
  name: string;
  user: User;
  format: DeckFormat;
  isPublic: boolean;
  cards?: DeckCard[];
  createdAt?: Date;
  updatedAt?: Date;
}
