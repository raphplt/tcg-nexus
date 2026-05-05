import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { searchService } from "@/services/search.service";

vi.mock("@/services/search.service", () => ({
  searchService: {
    globalSearch: vi.fn(),
    getSuggestionsPreview: vi.fn(),
  },
}));

const mockedGlobalSearch = vi.mocked(searchService.globalSearch);
const mockedSuggestionsPreview = vi.mocked(searchService.getSuggestionsPreview);

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

const suggestionsPayload = {
  suggestions: [
    {
      id: "1",
      type: "card" as const,
      title: "Pikachu",
      subtitle: "Base set",
    },
  ],
  total: 1,
  query: "",
};

const resultsPayload = {
  results: [
    {
      id: "card-42",
      type: "card" as const,
      title: "Dracaufeu",
      description: "Rare holo",
      url: "/pokemon/card-42",
    },
  ],
  totalCount: 1,
  page: 1,
  limit: 10,
};

describe("useGlobalSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("charge les suggestions par défaut quand la query est vide", async () => {
    mockedSuggestionsPreview.mockResolvedValueOnce(suggestionsPayload);

    const { result } = renderHook(
      () => useGlobalSearch({ query: "", debounceMs: 0 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });
    expect(result.current.suggestions[0]?.title).toBe("Pikachu");
    expect(result.current.results).toEqual([]);
    expect(mockedGlobalSearch).not.toHaveBeenCalled();
  });

  it("déclenche une recherche au-delà d'un caractère, pas avant", async () => {
    mockedSuggestionsPreview.mockResolvedValue(suggestionsPayload);
    mockedGlobalSearch.mockResolvedValue(
      resultsPayload as unknown as Awaited<
        ReturnType<typeof searchService.globalSearch>
      >,
    );

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) =>
        useGlobalSearch({ query, debounceMs: 0 }),
      {
        wrapper: createWrapper(),
        initialProps: { query: "" },
      },
    );

    await waitFor(() => expect(result.current.suggestions).toHaveLength(1));

    // 1 caractère : on reste en mode suggestions, pas de requête de recherche.
    rerender({ query: "p" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockedGlobalSearch).not.toHaveBeenCalled();

    // À partir de 2 caractères, la recherche se déclenche.
    rerender({ query: "pi" });
    await waitFor(() =>
      expect(result.current.results[0]?.title).toBe("Dracaufeu"),
    );
    expect(result.current.suggestions).toEqual([]);
    expect(mockedGlobalSearch).toHaveBeenCalledTimes(1);
    expect(mockedGlobalSearch).toHaveBeenCalledWith({
      query: "pi",
      limit: 10,
      sortBy: "relevance",
      sortOrder: "DESC",
    });
  });

  it("ne fetch rien tant que enabled est false", async () => {
    const { result } = renderHook(
      () => useGlobalSearch({ query: "pika", debounceMs: 0, enabled: false }),
      { wrapper: createWrapper() },
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(result.current.results).toEqual([]);
    expect(result.current.suggestions).toEqual([]);
    expect(mockedGlobalSearch).not.toHaveBeenCalled();
    expect(mockedSuggestionsPreview).not.toHaveBeenCalled();
  });
});
