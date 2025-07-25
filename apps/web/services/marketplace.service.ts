import type { PaginationParams, PaginatedResult } from "@/types/pagination";
import { Listing } from "@/types/listing";
import { fetcher } from "@/utils/fetch";

export interface MarketplaceQueryParams extends PaginationParams {
  search?: string;
  cardState?: string;
  currency?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export const marketplaceService = {
  /**
   * Récupère les listings paginés avec filtres et tri
   * @param params Query params (page, limit, search, cardState, currency, sortBy, sortOrder)
   */
  async getPaginated(
    params: MarketplaceQueryParams = {},
  ): Promise<PaginatedResult<Listing>> {
    return fetcher<PaginatedResult<Listing>>("/listings", { params });
  },

  /**
   * Récupère un listing par son ID
   * @param id ID du listing
   */
  async getListingById(id: string): Promise<Listing> {
    return fetcher<Listing>(`/listings/${id}`);
  },
}; 