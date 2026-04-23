import { useQuery } from "@tanstack/react-query";
import {
  searchService,
  type SearchResultItem,
  type SuggestionPreviewItem,
} from "@/services/search.service";
import { useDebounce } from "./useDebounce";

type UseGlobalSearchOptions = {
  query: string;
  enabled?: boolean;
  debounceMs?: number;
  resultsLimit?: number;
  suggestionsLimit?: number;
};

type UseGlobalSearchReturn = {
  results: SearchResultItem[];
  suggestions: SuggestionPreviewItem[];
  isLoading: boolean;
};

export function useGlobalSearch({
  query,
  enabled = true,
  debounceMs = 300,
  resultsLimit = 10,
  suggestionsLimit = 8,
}: UseGlobalSearchOptions): UseGlobalSearchReturn {
  const debouncedQuery = useDebounce(query, debounceMs);
  const hasQuery = debouncedQuery.length > 1;

  const resultsQuery = useQuery({
    queryKey: ["global-search", "results", debouncedQuery, resultsLimit],
    enabled: enabled && hasQuery,
    staleTime: 30_000,
    queryFn: () =>
      searchService.globalSearch({
        query: debouncedQuery,
        limit: resultsLimit,
        sortBy: "relevance",
        sortOrder: "DESC",
      }),
  });

  const suggestionsQuery = useQuery({
    queryKey: ["global-search", "suggestions", suggestionsLimit],
    enabled: enabled && !hasQuery,
    staleTime: 5 * 60_000,
    queryFn: () => searchService.getSuggestionsPreview("", suggestionsLimit),
  });

  return {
    results: hasQuery ? (resultsQuery.data?.results ?? []) : [],
    suggestions: hasQuery ? [] : (suggestionsQuery.data?.suggestions ?? []),
    isLoading: hasQuery
      ? resultsQuery.isFetching
      : suggestionsQuery.isFetching,
  };
}
