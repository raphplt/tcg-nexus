export type FaqCategory =
  | "Tournois"
  | "Collection"
  | "Marketplace"
  | "Decks"
  | "Compte";

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category: FaqCategory;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  "Tournois",
  "Collection",
  "Marketplace",
  "Decks",
  "Compte",
];
