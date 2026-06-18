import { secureApi } from "./secureApi";
import type {
  CollectionItem,
  CollectionItemsPaginatedResponse,
  CollectionItemResponse,
  UserCollection,
} from "@/types";

export interface CreateCollectionPayload {
  name?: string;
  description?: string;
  isPublic?: boolean;
  userId?: number;
  masterSetId?: string;
}

export interface UpdateCollectionPayload {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface CollectionItemsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "added_at" | "pokemonCard.name" | "pokemonCard.rarity" | "quantity";
  sortOrder?: "ASC" | "DESC";
  setId?: string;
  serieId?: string;
  rarity?: string;
  cardState?: string;
}

export const collectionService = {
  async getUserCollections(userId: number): Promise<UserCollection[]> {
    const response = await secureApi.get<UserCollection[]>(
      `/collection/user/${userId}`,
    );

    return response.data || [];
  },

  async getMyCollections(): Promise<UserCollection[]> {
    const response = await secureApi.get<UserCollection[]>(
      "/collection/my/collections",
    );
    return response.data || [];
  },

  async getCollectionById(collectionId: string): Promise<UserCollection> {
    const response = await secureApi.get<UserCollection>(
      `/collection/${collectionId}`,
    );
    return response.data;
  },

  async getCollectionItems(
    collectionId: string,
    params: CollectionItemsQueryParams = {},
  ): Promise<CollectionItemsPaginatedResponse> {
    const response = await secureApi.get<CollectionItemsPaginatedResponse>(
      `/collection/${collectionId}/items`,
      {
        params: {
          limit: params.limit ?? 24,
          page: params.page ?? 1,
          search: params.search,
          sortBy: params.sortBy ?? "added_at",
          sortOrder: params.sortOrder ?? "DESC",
          setId: params.setId,
          serieId: params.serieId,
          rarity: params.rarity,
          cardState: params.cardState,
        },
      },
    );

    return response.data;
  },

  async createCollection(
    payload: CreateCollectionPayload,
  ): Promise<UserCollection> {
    const response = await secureApi.post<UserCollection>(
      "/collection",
      payload,
    );
    return response.data;
  },

  async updateCollection(
    collectionId: string,
    payload: UpdateCollectionPayload,
  ): Promise<UserCollection> {
    const response = await secureApi.put<UserCollection>(
      `/collection/${collectionId}`,
      payload,
    );
    return response.data;
  },

  async deleteCollection(collectionId: string): Promise<void> {
    await secureApi.delete(`/collection/${collectionId}`);
  },

  async deleteCollectionItem(
    collectionId: string,
    itemId: number,
  ): Promise<void> {
    await secureApi.delete(`/collection/${collectionId}/items/${itemId}`);
  },

  async searchCollectionItems(
    collectionId: string,
    search: string,
  ): Promise<CollectionItem[]> {
    const response = await this.getCollectionItems(collectionId, {
      limit: 24,
      page: 1,
      search,
    });

    return response.data;
  },

  async addCardToCollection(
    collectionId: string,
    pokemonCardId: string,
  ): Promise<CollectionItemResponse> {
    try {
      const directResponse = await secureApi.post<CollectionItemResponse>(
        `/collection/${collectionId}/items`,
        { pokemonCardId },
      );
      return directResponse.data;
    } catch {
      const fallbackResponse = await secureApi.post<CollectionItemResponse>(
        `/collection-item/collection/${collectionId}`,
        { pokemonCardId },
      );

      return fallbackResponse.data;
    }
  },

  async addToWishlist(
    userId: number,
    pokemonCardId: string,
  ): Promise<CollectionItemResponse> {
    const response = await secureApi.post<CollectionItemResponse>(
      `/collection-item/wishlist/${userId}`,
      { pokemonCardId },
    );
    return response.data;
  },

  async addToFavorites(
    userId: number,
    pokemonCardId: string,
  ): Promise<CollectionItemResponse> {
    const response = await secureApi.post<CollectionItemResponse>(
      `/collection-item/favorites/${userId}`,
      { pokemonCardId },
    );
    return response.data;
  },

  async removeCardFromCollection(
    collectionId: string,
    pokemonCardId: string,
  ): Promise<any> {
    const response = await secureApi.post(
      `/collection/${collectionId}/items/remove`,
      { pokemonCardId },
    );
    return response.data;
  },

  async getCollectionRarities(collectionId: string): Promise<string[]> {
    const response = await secureApi.get<string[]>(
      `/collection/${collectionId}/rarities`,
    );
    return response.data || [];
  },
};
