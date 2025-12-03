import { User } from "./auth";
import { DeckFormat } from "@/types/deckFormat";
import { DeckCard } from "@/types/deck-cards";

export interface Deck {
  id: number;
  name: string;
  user: User;
  format: DeckFormat;
  isPublic: boolean;
  views: number;
  coverCard?: {
    image: string;
    name: string;
  };
  cards?: DeckCard[];
  createdAt: Date;
  updatedAt?: Date;
}
