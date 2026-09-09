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
  setId?: string;
  serieId?: string;
  rarity?: string;
  cardState?: string;
  ownedOnly?: boolean;
  cardsOnly?: boolean;
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

  async createCollection(
    payload: CreateCollectionPayload,
  ): Promise<Collection> {
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

  async getCompletion(
    id: string,
    policy?: string,
  ): Promise<import("@/types/collection").CollectionCompletion> {
    return fetcher<import("@/types/collection").CollectionCompletion>(
      `/collection/${id}/completion`,
      { params: policy ? { policy } : undefined },
    );
  },

  async getValuation(
    id: string,
    currency?: string,
  ): Promise<import("@/types/collection").CollectionValuation> {
    return fetcher<import("@/types/collection").CollectionValuation>(
      `/collection/${id}/valuation`,
      { params: currency ? { currency } : undefined },
    );
  },

  async exportCsv(id: string): Promise<string> {
    return authedFetch<string>("GET", `/collection/${id}/export/csv`, {
      responseType: "text",
    });
  },

  async importCsv(
    id: string,
    payload: {
      csvContent?: string;
      fileUrl?: string;
      mapping?: Record<string, string>;
      mode?: "MERGE" | "REPLACE";
      operationId?: string;
    },
  ): Promise<import("@/types/collection").ImportResult> {
    return authedFetch<import("@/types/collection").ImportResult>(
      "POST",
      `/collection/${id}/import/csv`,
      { data: payload },
    );
  },

  async bulkMove(
    id: string,
    targetCollectionId: string,
    itemIds: number[],
  ): Promise<{ movedCount: number; operationId: string }> {
    return authedFetch<{ movedCount: number; operationId: string }>(
      "POST",
      `/collection/${id}/items/bulk-move`,
      { data: { targetCollectionId, itemIds } },
    );
  },

  async bulkDelete(
    id: string,
    itemIds: number[],
  ): Promise<{ deletedCount: number; operationId: string }> {
    return authedFetch<{ deletedCount: number; operationId: string }>(
      "POST",
      `/collection/${id}/items/bulk-delete`,
      { data: { itemIds } },
    );
  },

  async undoOperation(
    id: string,
    operationId: string,
  ): Promise<import("@/types/collection").UndoOperationResult> {
    return authedFetch<import("@/types/collection").UndoOperationResult>(
      "POST",
      `/collection/${id}/items/undo-operation`,
      { data: { operationId } },
    );
  },

  async wishlistMissing(id: string): Promise<{ addedCount: number }> {
    return authedFetch<{ addedCount: number }>(
      "POST",
      `/collection/${id}/wishlist-missing`,
    );
  },

  async getMissingCardOffers(
    collectionId: string,
    cardId: string,
  ): Promise<any[]> {
    return fetcher<any[]>(`/collection/${collectionId}/cards/${cardId}/offers`);
  },

  async listDuplicate(
    collectionId: string,
    itemId: number,
    data: {
      price: number;
      currency?: string;
      quantity?: number;
      description?: string;
    },
  ): Promise<any> {
    return authedFetch<any>(
      "POST",
      `/collection/${collectionId}/items/${itemId}/list-duplicate`,
      { data },
    );
  },

  async updateCollectionItem(
    itemId: number,
    data: Record<string, any>,
  ): Promise<CollectionItemType> {
    return authedFetch<CollectionItemType>(
      "PATCH",
      `/collection-item/${itemId}`,
      {
        data,
      },
    );
  },

  async splitCollectionItem(
    itemId: number,
    quantity: number,
  ): Promise<{ original: CollectionItemType; split: CollectionItemType }> {
    return authedFetch<{
      original: CollectionItemType;
      split: CollectionItemType;
    }>("POST", `/collection-item/${itemId}/split`, { data: { quantity } });
  },

  async mergeCollectionItems(
    itemId: number,
    targetItemId: number,
  ): Promise<CollectionItemType> {
    return authedFetch<CollectionItemType>(
      "POST",
      `/collection-item/${itemId}/merge/${targetItemId}`,
    );
  },
};
