import type { PaginationParams, PaginatedResult } from "@/types/pagination";
import { Collection, CollectionItemType } from "@/types/collection";
import { fetcher } from "@/utils/fetch";

export interface CollectionQueryParams extends PaginationParams {
  search?: string;
  category?: string;
  isPublic?: boolean;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface CollectionItemsQueryParams extends PaginationParams {
  search?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export const collectionService = {
  /**
   * Récupère les collections paginées avec filtres et tri
   * @param params Query params (page, limit, search, category, isPublic, sortBy, sortOrder)
   */
  async getAll(
    params: CollectionQueryParams = {},
  ): Promise<PaginatedResult<Collection>> {
    return fetcher<PaginatedResult<Collection>>("/collection", { params });
  },

  async getByUserId(
    userId: number,
    params: CollectionQueryParams = {},
  ): Promise<PaginatedResult<Collection>> {
    return fetcher<PaginatedResult<Collection>>(`/collection/user/${userId}`, {
      params,
    });
  },

  async getById(id: string): Promise<Collection> {
    return fetcher<Collection>(`/collection/${id}`);
  },

  async getItemsPaginated(
    id: string,
    params: CollectionItemsQueryParams = {},
  ): Promise<PaginatedResult<CollectionItemType>> {
    return fetcher<PaginatedResult<CollectionItemType>>(
      `/collection/${id}/items`,
      { params },
    );
  },

  async createCollection(collection: Collection): Promise<Collection> {
    return fetcher<Collection>("/collection", {
      method: "POST",
      body: collection,
    });
  },
};
