import { api } from "./api";
import type {
  CardSearchResolution,
  CardSearchResult,
  OcrParsedResult,
} from "@/types";

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

const scoreCard = (card: CardSearchResult, ocr: OcrParsedResult): number => {
  let score = 0;

  const cardName = normalize(card.name);
  const cardLocalId = normalize(card.localId);
  const cardSetName = normalize(card.set?.name);

  const targetName = normalize(ocr.cardName);
  const targetSetName = normalize(ocr.setName);
  const targetSetNumber = normalize(ocr.setNumber);

  if (targetName && cardName === targetName) {
    score += 70;
  } else if (targetName && cardName.includes(targetName)) {
    score += 45;
  } else if (targetName && targetName.includes(cardName)) {
    score += 35;
  }

  if (targetSetNumber && cardLocalId && cardLocalId === targetSetNumber) {
    score += 45;
  }

  if (targetSetName && cardSetName && cardSetName.includes(targetSetName)) {
    score += 20;
  }

  if (!targetName && cardName) {
    score += 5;
  }

  return score;
};

const buildHints = (ocr: OcrParsedResult): string[] => {
  const hints: string[] = [];

  if (ocr.cardName && ocr.setCode) {
    hints.push(`${ocr.cardName} ${ocr.setCode}`);
  }

  if (ocr.cardName && ocr.setNumber) {
    hints.push(`${ocr.cardName} ${ocr.setNumber}`);
  }

  if (ocr.cardName) {
    hints.push(ocr.cardName);
  }

  if (ocr.setCode) {
    hints.push(ocr.setCode);
  }

  if (ocr.setNumber) {
    hints.push(ocr.setNumber);
  }

  if (ocr.setName) {
    hints.push(ocr.setName);
  }

  return Array.from(new Set([...hints, ...ocr.searchHints])).filter(Boolean);
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
    const query = search.trim();
    if (!query) {
      return [];
    }

    const cacheKey = normalize(query);
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await api.get<CardSearchResult[]>(
      `/cards/search/${encodeURIComponent(query)}`,
    );

    const cards = dedupeCards(response.data || []);
    searchCache.set(cacheKey, cards);
    return cards;
  },

  async resolveCardFromOcr(ocr: OcrParsedResult): Promise<CardSearchResolution> {
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
