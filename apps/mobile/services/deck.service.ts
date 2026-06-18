import { secureApi } from "./secureApi";
import { api } from "./api";
import type {
  Deck,
  DeckFormat,
  DeckAnalysis,
  DecksQueryParams,
  PaginatedResult,
  DeckExportJson,
} from "@/types";

interface cardPayload {
  id?: number;
  cardId: string;
  qty: number;
  role: string;
}

export interface CreateDeckParams {
  deckName: string;
  formatId: number;
  isPublic: boolean;
  cards: cardPayload[];
}

export interface UpdateDeckParams {
  cardsToAdd: { cardId: string; qty: number; role: string }[];
  cardsToRemove: { id: number }[] | [];
  cardsToUpdate: { id: number; qty: number; role: string }[] | [];
  deckName?: string;
  formatId?: string;
  isPublic?: boolean;
}

export const deckService = {
  async getPaginated(
    params: DecksQueryParams = {},
  ): Promise<PaginatedResult<Deck>> {
    const response = await secureApi.get<PaginatedResult<Deck>>("/deck", { params });
    return response.data;
  },

  async getUserDecksPaginated(
    params: DecksQueryParams = {},
  ): Promise<PaginatedResult<Deck>> {
    const response = await secureApi.get<PaginatedResult<Deck>>("/deck/me", { params });
    return response.data;
  },

  async getDeckById(id: string): Promise<Deck> {
    const response = await secureApi.get<Deck>(`/deck/${id}`);
    return response.data;
  },

  async create(data: CreateDeckParams): Promise<Deck> {
    const response = await secureApi.post<Deck>("/deck", data);
    return response.data;
  },

  async removeDeck(deckId: number): Promise<void> {
    await secureApi.delete(`/deck/${deckId}`);
  },

  async update(id: number, data: UpdateDeckParams): Promise<Deck> {
    const response = await secureApi.patch<Deck>(`/deck/${id}`, data);
    return response.data;
  },

  async incrementView(id: number): Promise<void> {
    await secureApi.post(`/deck/${id}/view`);
  },

  async analyzeDeck(id: number): Promise<DeckAnalysis> {
    const response = await secureApi.post<DeckAnalysis>(`/deck/${id}/analyze`);
    return response.data;
  },

  async shareDeck(id: number): Promise<{ code: string }> {
    const response = await secureApi.post<{ code: string }>(`/deck/${id}/share`);
    return response.data;
  },

  async getDeckForImport(code: string): Promise<Deck> {
    const response = await secureApi.get<Deck>(`/deck/import/${code}`);
    return response.data;
  },

  async importDeck(code: string): Promise<Deck> {
    const response = await secureApi.post<Deck>(`/deck/import/${code}`);
    return response.data;
  },

  async exportDeckJson(id: number): Promise<DeckExportJson> {
    const response = await secureApi.get<DeckExportJson>(`/deck/export/${id}`);
    return response.data;
  },

  async importDeckFromJson(
    data: DeckExportJson,
  ): Promise<{ deck: Deck; warnings?: string[] }> {
    const response = await secureApi.post<{ deck: Deck; warnings?: string[] }>("/deck/import-json", data);
    return response.data;
  },

  async getSavedDecksPaginated(
    params: DecksQueryParams = {},
  ): Promise<PaginatedResult<Deck>> {
    const response = await secureApi.get<PaginatedResult<Deck>>("/deck/saved", { params });
    return response.data;
  },

  async getSavedDeckIds(): Promise<number[]> {
    const response = await secureApi.get<number[]>("/deck/saved/ids");
    return response.data || [];
  },

  async saveDeckToLibrary(
    deckId: number,
  ): Promise<{ saved: boolean; alreadySaved?: boolean }> {
    const response = await secureApi.post<{ saved: boolean; alreadySaved?: boolean }>(`/deck/${deckId}/save`);
    return response.data;
  },

  async removeDeckFromLibrary(deckId: number): Promise<{ saved: boolean }> {
    const response = await secureApi.delete<{ saved: boolean }>(`/deck/${deckId}/save`);
    return response.data;
  },

  async getPublicDecksByUser(
    userId: number,
    params: { page?: number; limit?: number } = {},
  ): Promise<{ items: Deck[]; total: number; page: number; limit: number }> {
    const response = await secureApi.get<{ items: Deck[]; total: number; page: number; limit: number }>(
      `/deck/user/${userId}/public`,
      { params },
    );
    return response.data;
  },

  async getFormats(): Promise<DeckFormat[]> {
    const response = await secureApi.get<DeckFormat[]>("deck-format");
    return response.data || [];
  },
};
