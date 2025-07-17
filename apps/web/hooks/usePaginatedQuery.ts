import { useQuery, UseQueryOptions, QueryKey } from "@tanstack/react-query";

/**
 * Hook réutilisable pour la pagination, le filtre et le tri avec Tanstack Query
 * @param key Clé de la query (ex: ['tournaments'])
 * @param fetcherFn Fonction fetcher qui prend les params (page, limit, ...)
 * @param params Paramètres de pagination, filtre, tri
 * @param options Options Tanstack Query
 * @returns { data, isLoading, error, refetch, ... }
 *
 * Utilisation :
 * const { data, isLoading } = usePaginatedQuery<PaginatedResult<Tournament>>(['tournaments'], tournamentService.getPaginated, { page, limit, search })
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
