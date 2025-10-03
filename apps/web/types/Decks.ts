import { User } from "./auth";
import { DeckFormat } from "@/types/deckFormat";
import {DeckCards} from "@/types/deck-cards";

export interface Decks {
  id: number;
  name: string;
  user: User;
  format: DeckFormat;
  cards?: DeckCards[];
  createdAt?: Date;
  updatedAt?: Date;
}
