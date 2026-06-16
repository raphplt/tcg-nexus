import type {
  CardSearchResolution,
  CardSearchResult,
  CardSearchResult,
  OcrParsedResult,
  PokemonSerieType,
  PokemonSetType,
} from "@/types";
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

  async resolveCardFromOcr(
    ocr: OcrParsedResult,
  ): Promise<CardSearchResolution> {
    const hints = buildHints(ocr);
    const searchedTerms: string[] = [];
    const allCandidates: CardSearchResult[] = [];

    for (const hint of hints) {
      const term = hint.trim();
      if (!term) {
        continue;
      }

      searchedTerms.push(term);
      const result = await this.searchCards(term);
      allCandidates.push(...result);

      // Short-circuit on highly probable direct match.
      if (result.some((card) => scoreCard(card, ocr) >= 90)) {
        break;
      }
    }

    const candidates = dedupeCards(allCandidates);
    if (candidates.length === 0) {
      return {
        bestCard: null,
        candidates,
        searchedTerms,
      };
    }

    const ranked = [...candidates].sort(
      (a, b) => scoreCard(b, ocr) - scoreCard(a, ocr),
    );

    return {
      bestCard: ranked[0] || null,
      candidates: ranked,
      searchedTerms,
    };
  },
};
