import { type QueryKey, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { PaginatedResult } from "@/types/pagination";

interface InfinitePaginatedQueryOptions<T> {
  queryKey: QueryKey;
  /** Fetches one page (1-based) of the list. */
  queryFn: (page: number) => Promise<PaginatedResult<T>>;
  enabled?: boolean;
  /** Drops items already loaded, in case the list shifted between two pages. */
  getItemKey?: (item: T) => string | number;
}

/**
 * Loads a paginated API list page by page for infinite scrolling.
 * @returns The TanStack infinite query, plus the flattened `items` and `totalItems`.
 */
export function useInfinitePaginatedQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
  getItemKey,
}: InfinitePaginatedQueryOptions<T>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      allPages.length < lastPage.meta.totalPages
        ? allPages.length + 1
        : undefined,
    enabled,
  });

  const items = useMemo(() => {
    const loaded = query.data?.pages.flatMap((page) => page.data) ?? [];
    if (!getItemKey) return loaded;
    const seen = new Set<string | number>();
    return loaded.filter((item) => {
      const key = getItemKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [query.data, getItemKey]);

  return {
    ...query,
    items,
    totalItems: query.data?.pages[0]?.meta.totalItems,
  };
}
