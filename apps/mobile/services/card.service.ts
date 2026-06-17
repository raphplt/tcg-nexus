import { api } from "./api";
import type { CardSearchResult } from "@/types";

const searchCache = new Map<string, CardSearchResult[]>();

const normalize = (value: string | undefined): string =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const dedupeCards = (cards: CardSearchResult[]): CardSearchResult[] => {
  const seen = new Set<string>();
  const out: CardSearchResult[] = [];
  for (const card of cards) {
    if (!card.id || seen.has(card.id)) continue;
    seen.add(card.id);
    out.push(card);
  }
  return out;
};

export const cardService = {
  clearCache() {
    searchCache.clear();
  },

  async getCardById(cardId: string): Promise<CardSearchResult> {
    const response = await api.get<CardSearchResult>(`/pokemon-card/${cardId}`);
    return response.data;
  },

  /**
   * Recherche textuelle libre dans la BDD Pokémon.
   * Utilisée par la recherche manuelle dans l'UI de review.
   */
  async searchCards(search: string): Promise<CardSearchResult[]> {
    const query = search.trim();
    if (!query) return [];

    const cacheKey = normalize(query);
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    const response = await api.get<CardSearchResult[]>(
      `/pokemon-card/search/${encodeURIComponent(query)}`,
    );

    const cards = dedupeCards(response.data || []);
    searchCache.set(cacheKey, cards);
    return cards;
  },
};
