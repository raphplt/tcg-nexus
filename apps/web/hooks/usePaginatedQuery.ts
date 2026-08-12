import { useQuery, UseQueryOptions, QueryKey } from "@tanstack/react-query";

/**
 * Reusable TanStack Query hook for pagination, filtering, and sorting.
 * @param key Query key (for example, `['tournaments']`).
 * @param fetcherFn Fetcher function accepting query parameters such as page and limit.
 * @param params Pagination, filtering, and sorting parameters.
 * @param options - TanStack Query options.
 * @returns { data, isLoading, error, refetch, ... }
 *
 */
export function usePaginatedQuery<T = any>(
  key: QueryKey,
  fetcherFn: (params: any) => Promise<T>,
  params: any = {},
  options?: UseQueryOptions<T>,
) {
  const opts = { ...options, keepPreviousData: true };
  return useQuery<T>({
    queryKey: [...key, params],
    queryFn: () => fetcherFn(params),
    ...opts,
  });
}
