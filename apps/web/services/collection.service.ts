import type { PaginationParams, PaginatedResult } from "@/types/pagination";
import { Collection, CollectionItemType } from "@/types/collection";
import { authedFetch, fetcher } from "@/utils/fetch";

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
  rarity?: string;
}

export interface CreateCollectionPayload {
  name?: string;
  description?: string;
  isPublic?: boolean;
  userId?: number;
  masterSetId?: string;
}

export const collectionService = {
  /**
   * Retrieves paginated collections with filters and sorting.
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

  async getMyCollections(): Promise<Collection[]> {
    return authedFetch<Collection[]>("GET", "/collection/my/collections");
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

  async getSetRarities(id: string): Promise<string[]> {
    return fetcher<string[]>(`/collection/${id}/rarities`);
  },

  async createCollection(payload: CreateCollectionPayload): Promise<Collection> {
    return authedFetch<Collection>("POST", "/collection", {
      data: payload,
    });
  },

  async deleteCollection(id: string): Promise<void> {
    return authedFetch<void>("DELETE", `/collection/${id}`);
  },

  async addCardToCollection(
    collectionId: string,
    pokemonCardId: string,
  ): Promise<CollectionItemType> {
    return authedFetch<CollectionItemType>(
      "POST",
      `/collection/${collectionId}/items`,
      {
        data: { pokemonCardId },
      },
    );
  },

  async removeCardFromCollection(
    collectionId: string,
    pokemonCardId: string,
  ): Promise<CollectionItemType | null> {
    return authedFetch<CollectionItemType | null>(
      "POST",
      `/collection/${collectionId}/items/remove`,
      {
        data: { pokemonCardId },
      },
    );
  },

  async deleteCollectionItem(
    collectionId: string,
    itemId: number,
  ): Promise<void> {
    return authedFetch<void>(
      "DELETE",
      `/collection/${collectionId}/items/${itemId}`,
    );
  },
};
