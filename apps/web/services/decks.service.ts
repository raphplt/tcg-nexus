import type { PaginationParams, PaginatedResult } from "@/types/pagination";
import { Listing } from "@/types/listing";
import { authedFetch, fetcher } from "@/utils/fetch";
import { Decks } from "@/types/Decks";
import { DeckCards } from "@/types/deck-cards";
import {usePaginatedQuery} from "@hooks/usePaginatedQuery";

export interface DecksQueryParams extends PaginationParams {
  search?: string;
  formatId?: number;
  userId?: number;
  currency?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

interface card {
  id?: number;
  cardId: string;
  name: string;
  qty: number;
  role: string;
}

interface createDeckParams {
  deckName: string;
  formatId: number;
  isPublic: boolean;
  cards: card[];
}

type updateDeckParams = {
  cardsToAdd: any;
  cardsToRemove: { id: number }[] | [];
  cardsToUpdate: DeckCards[] | [];
} & Partial<{
  deckName: string;
  formatId: string;
  isPublic: boolean;
}>;

export const decksService = {
  /**
   * Récupère les listings paginés avec filtres et tri
   * @param params Query params (page, limit, search, cardState, currency, sortBy, sortOrder)
   */
  async getPaginated(
    params: DecksQueryParams = {},
  ): Promise<PaginatedResult<Decks>> {
    return fetcher<PaginatedResult<Decks>>("/deck", { params });
  },

  async getUserDecksPaginated(
    params: DecksQueryParams = {},
  ): Promise<PaginatedResult<Decks>> {
    return fetcher<PaginatedResult<Decks>>("/deck/me", { params });
  },

  /**
   * Récupère un deck par son ID
   * @param id ID du deck
   */
  async getDeckById(id: string) {
    return fetcher(`/deck/${id}`);
  },
  async create(data: createDeckParams) {
    return authedFetch("POST", "/deck", { data: data });
  },
  async removeDeck(deckId: number) {
    return authedFetch("DELETE", `/deck/${deckId}`);
  },
  async update(id: number, data: updateDeckParams) {
    return authedFetch("PATCH", `/deck/${id}`, { data: data });
  },
  useUserDecksPaginated(page: number, filters: any) {
    return usePaginatedQuery<PaginatedResult<Decks>>(
        ["decks", page, filters.search, filters.sortBy, filters.sortOrder],
        decksService.getUserDecksPaginated,
        {
          page,
          limit: 8,
          search: filters.search || undefined,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          formatId: filters.format || undefined,
        },
    );
  },
};
