import api from "../utils/fetch";

export interface SearchResultItem {
  id: string | number;
  type: "card" | "tournament" | "player" | "marketplace";
  title: string;
  description: string;
  url: string;
  image?: string;
  metadata?: Record<string, any>;
  relevanceScore?: number;
}

export interface GlobalSearchResult {
  results: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query: string;
  searchTime: number;
}

export interface SuggestionPreviewItem {
  id: string | number;
  type: "card" | "tournament" | "player" | "marketplace";
  title: string;
  subtitle?: string;
  image?: string;
}

export interface SuggestionDetailItem {
  id: string | number;
  type: "card" | "tournament" | "player" | "marketplace";
  title: string;
  description: string;
  url: string;
  image?: string;
  metadata?: Record<string, any>;
}

export interface SuggestionsPreviewResult {
  suggestions: SuggestionPreviewItem[];
  total: number;
  query: string;
}

export interface SuggestionsDetailResult {
  suggestions: SuggestionDetailItem[];
  total: number;
  query: string;
}

export interface SearchParams {
  query: string;
  type?: "all" | "cards" | "tournaments" | "players" | "marketplace";
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export const searchService = {
  async globalSearch(params: SearchParams): Promise<GlobalSearchResult> {
    const searchParams = new URLSearchParams();

    searchParams.append("query", params.query);
    if (params.type) searchParams.append("type", params.type);
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const response = await api.get<GlobalSearchResult>(
      `/search?${searchParams.toString()}`,
    );
    return response.data;
  },

  async getSearchSuggestions(
    query: string,
    limit: number = 5,
  ): Promise<string[]> {
    const searchParams = new URLSearchParams();
    searchParams.append("q", query);
    searchParams.append("limit", limit.toString());

    const response = await api.get<string[]>(
      `/search/suggestions?${searchParams.toString()}`,
    );
    return response.data;
  },

  async getSuggestionsPreview(
    query: string,
    limit: number = 8,
  ): Promise<SuggestionsPreviewResult> {
    const searchParams = new URLSearchParams();
    searchParams.append("q", query);
    searchParams.append("limit", limit.toString());

    const response = await api.get<SuggestionsPreviewResult>(
      `/search/suggestions/preview?${searchParams.toString()}`,
    );
    return response.data;
  },

  async getSuggestionsDetail(
    query: string,
    limit: number = 5,
  ): Promise<SuggestionsDetailResult> {
    const searchParams = new URLSearchParams();
    searchParams.append("q", query);
    searchParams.append("limit", limit.toString());

    const response = await api.get<SuggestionsDetailResult>(
      `/search/suggestions/detail?${searchParams.toString()}`,
    );
    return response.data;
  },
};
