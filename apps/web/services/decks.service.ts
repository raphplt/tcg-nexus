import type { PaginationParams, PaginatedResult } from "@/types/pagination";
import { Listing } from "@/types/listing";
import { authedFetch, fetcher } from "@/utils/fetch";
import { Decks } from "@/types/Decks";

export interface DecksQueryParams extends PaginationParams {
  search?: string;
  formatId?: number;
  userId?: number;
  currency?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

interface card {
  cardId: string,
  name: string,
  qty: number
}
interface createDeckParams {
  name: string;
  formatId: number;
  isPublic: boolean;
  cards: card[];
}
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

  /**
   * Récupère un deck par son ID
   * @param id ID du deck
   */
  async getDeckById(id: string): Promise<Listing> {
    return fetcher<Listing>(`/deck/${id}`);
  },
  async create(data:createDeckParams)
  {
    return authedFetch<Listing>("POST","/deck", { data: data });
  }
};