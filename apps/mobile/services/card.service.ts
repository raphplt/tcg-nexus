import type { CardSearchResult } from "@/types";
import { api } from "./api";

const searchCache = new Map<string, CardSearchResult[]>();

const normalize = (value: string | undefined): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const dedupeCards = (cards: CardSearchResult[]): CardSearchResult[] => {
  const seen = new Set<string>();
  const next: CardSearchResult[] = [];

  for (const card of cards) {
    if (!card.id || seen.has(card.id)) {
      continue;
    }

    seen.add(card.id);
    next.push(card);
  }

  return next;
};

export const cardService = {
  clearCache() {
    searchCache.clear();
  },

  async getCardById(cardId: string): Promise<CardSearchResult> {
    const response = await api.get<CardSearchResult>(`/cards/${cardId}`);
    return response.data;
  },

  async searchCards(search: string): Promise<CardSearchResult[]> {
    console.log("card service searchCards : ", search);
    const query = search.trim();
    if (!query) {
      return [];
    }
    const cacheKey = normalize(query);
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log("cached : ", cached);
      return cached;
    }

    const response = await api.get<CardSearchResult[]>(
      `/cards/search/${encodeURIComponent(query)}`,
    );

    const cards = dedupeCards(response.data || []);
    console.log("card service dedupeCards : ", cards);
    searchCache.set(cacheKey, cards);
    return cards;
  },
};
