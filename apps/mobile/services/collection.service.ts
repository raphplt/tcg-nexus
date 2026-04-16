import { secureApi } from "./secureApi";
import type {
  CollectionItemResponse,
  UserCollection,
} from "@/types";

interface CreateCollectionPayload {
  name: string;
  description?: string;
  isPublic?: boolean;
  userId?: number;
}

export const collectionService = {
  async getUserCollections(userId: number): Promise<UserCollection[]> {
    const response = await secureApi.get<UserCollection[]>(
      `/collection/user/${userId}`,
    );

    return response.data || [];
  },

  async createCollection(
    payload: CreateCollectionPayload,
  ): Promise<UserCollection> {
    const response = await secureApi.post<UserCollection>("/collection", payload);
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
};
