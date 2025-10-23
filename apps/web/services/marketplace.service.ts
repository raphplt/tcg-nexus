import type { PaginationParams, PaginatedResult } from "@/types/pagination";
import { Listing } from "@/types/listing";
import { fetcher, authedFetch } from "@/utils/fetch";

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

  /**
   * Récupère les listings de l'utilisateur connecté
   */
  async getMyListings(): Promise<Listing[]> {
    return authedFetch<Listing[]>("GET", "/listings/my-listings");
  },

  /**
   * Met à jour un listing
   */
  async updateListing(id: string, data: Partial<Listing>): Promise<Listing> {
    return authedFetch<Listing>("PATCH", `/listings/${id}`, { data });
  },

  /**
   * Supprime un listing
   */
  async deleteListing(id: string): Promise<void> {
    return authedFetch<void>("DELETE", `/listings/${id}`);
  },
};
