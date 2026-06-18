import type {
  CardSearchResult,
  CardsPaginatedResponse,
  OcrParsedResult,
  PokemonSerieType,
  PokemonSetType,
} from "@/types";
import { api } from "./api";

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
  async getSetRarities(setId: string): Promise<string[]> {
    const response = await api.get<string[]>(`/cards/set/${setId}/rarities`);
    return response.data || [];
  },

  async searchCards(search: string): Promise<CardSearchResult[]> {
    console.log("card service searchCards : ", search);
    const query = search.trim();
    if (!query) {
      return [];
    }
    const cacheKey = normalize(query);
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    const response = await api.get<CardSearchResult[]>(
      `/pokemon-card/search/${encodeURIComponent(query)}`,
    );

    const cards = dedupeCards(response.data || []);
    console.log("card service dedupeCards : ", cards);
    searchCache.set(cacheKey, cards);
    return cards;
  },

  async getAllSeries(): Promise<PokemonSerieType[]> {
    const response = await api.get<PokemonSerieType[]>("/pokemon-series");
    return response.data || [];
  },

  async getAllSets(): Promise<PokemonSetType[]> {
    const response = await api.get<PokemonSetType[]>("/pokemon-set");
    return response.data || [];
  },

  async getAllSeries(): Promise<PokemonSerieType[]> {
    const response = await api.get<PokemonSerieType[]>("/pokemon-series");
    return response.data || [];
  },

  async getPaginated(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      setId?: string;
      serieId?: string;
      rarity?: string;
      type?: string;
    } = {},
  ): Promise<CardsPaginatedResponse> {
    const response = await api.get<CardsPaginatedResponse>(
      "/pokemon-card/paginated",
      { params },
    );
    return response.data;
  },
};
