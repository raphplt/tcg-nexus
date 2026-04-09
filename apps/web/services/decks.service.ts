import type { PaginationParams, PaginatedResult } from "@/types/pagination";
import { authedFetch, fetcher } from "@/utils/fetch";
import { Deck } from "@/types/Decks";
import { DeckCard } from "@/types/deck-cards";
import { usePaginatedQuery } from "@hooks/usePaginatedQuery";
import { DeckAnalysis } from "@/types/deck-analysis";

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
  cardsToUpdate: DeckCard[] | [];
} & Partial<{
  deckName: string;
  formatId: string;
  isPublic: boolean;
}>;

export interface DeckExportCardJson {
  tcgDexId: string;
  name: string;
  qty: number;
  role: string;
}

export interface DeckExportJson {
  name: string;
  format: string;
  isPublic?: boolean;
  cards: DeckExportCardJson[];
}

export const decksService = {
  async getPaginated(
    params: DecksQueryParams = {},
  ): Promise<PaginatedResult<Deck>> {
    return fetcher<PaginatedResult<Deck>>("/deck", { params });
  },

  async getUserDecksPaginated(
    params: DecksQueryParams = {},
  ): Promise<PaginatedResult<Deck>> {
    return fetcher<PaginatedResult<Deck>>("/deck/me", { params });
  },

  async getDeckById(id: string): Promise<Deck> {
    return fetcher<Deck>(`/deck/${id}`);
  },

  async create(data: createDeckParams) {
    return authedFetch("POST", "/deck", { data });
  },

  async removeDeck(deckId: number) {
    return authedFetch("DELETE", `/deck/${deckId}`);
  },

  async update(id: number, data: updateDeckParams) {
    return authedFetch("PATCH", `/deck/${id}`, { data: data });
  },

  async incrementView(id: number) {
    return authedFetch("POST", `/deck/${id}/view`);
  },

  async analyzeDeck(id: number): Promise<DeckAnalysis> {
    return authedFetch("POST", `/deck/${id}/analyze`);
  },

  useUserDecksPaginated(page: number, filters: any) {
    return usePaginatedQuery<PaginatedResult<Deck>>(
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

  async shareDeck(id: number): Promise<{ code: string }> {
    return authedFetch("POST", `/deck/${id}/share`);
  },

  async getDeckForImport(code: string): Promise<Deck> {
    return fetcher<Deck>(`/deck/import/${code}`);
  },

  async importDeck(code: string): Promise<Deck> {
    return authedFetch("POST", `/deck/import/${code}`);
  },

  async exportDeckJson(id: number): Promise<DeckExportJson> {
    return fetcher<DeckExportJson>(`/deck/export/${id}`);
  },

  async importDeckFromJson(
    data: DeckExportJson,
  ): Promise<{ deck: Deck; warnings?: string[] }> {
    return authedFetch("POST", "/deck/import-json", { data });
  },

  async getSavedDecksPaginated(
    params: DecksQueryParams = {},
  ): Promise<PaginatedResult<Deck>> {
    return fetcher<PaginatedResult<Deck>>("/deck/saved", { params });
  },

  async getSavedDeckIds(): Promise<number[]> {
    return authedFetch("GET", "/deck/saved/ids");
  },

  async saveDeckToLibrary(
    deckId: number,
  ): Promise<{ saved: boolean; alreadySaved?: boolean }> {
    return authedFetch("POST", `/deck/${deckId}/save`);
  },

  async removeDeckFromLibrary(
    deckId: number,
  ): Promise<{ saved: boolean }> {
    return authedFetch("DELETE", `/deck/${deckId}/save`);
  },
};
