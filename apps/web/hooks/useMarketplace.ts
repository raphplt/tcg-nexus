import { useQuery } from "@tanstack/react-query";
import { marketplaceService, PopularCard, TrendingCard, BestSeller } from "@/services/marketplace.service";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { PokemonSetType, PokemonSerieType } from "@/types/cardPokemon";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { PaginatedResult } from "@/types/pagination";

export interface FilterState {
  search: string;
  setId?: string;
  serieId?: string;
  energyType?: string;
  rarity?: string;
  currency?: string;
  cardState?: string;
  language?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

/**
 * Hook pour récupérer les données de la page d'accueil du marketplace
 */
export function useMarketplaceHome() {
  // Récupère les cartes populaires
  const { data: popularCards, isLoading: loadingPopular } = useQuery<
    PopularCard[]
  >({
    queryKey: ["marketplace", "popular"],
    queryFn: () => marketplaceService.getPopularCards(8),
  });

  // Récupère les cartes en tendance
  const { data: trendingCards, isLoading: loadingTrending } = useQuery<
    TrendingCard[]
  >({
    queryKey: ["marketplace", "trending"],
    queryFn: () => marketplaceService.getTrendingCards(8, true),
  });

  // Récupère les meilleurs vendeurs
  const { data: bestSellers, isLoading: loadingSellers } = useQuery<
    BestSeller[]
  >({
    queryKey: ["marketplace", "best-sellers"],
    queryFn: () => marketplaceService.getBestSellers(6),
  });

  // Récupère les sets
  const { data: sets, isLoading: loadingSets } = useQuery<PokemonSetType[]>({
    queryKey: ["pokemon-sets"],
    queryFn: () => pokemonCardService.getAllSets(),
  });

  return {
    popularCards,
    trendingCards,
    bestSellers,
    sets,
    loadingPopular,
    loadingTrending,
    loadingSellers,
    loadingSets,
  };
}

/**
 * Hook pour récupérer les données de la page de catalogue de cartes du marketplace
 */
export function useMarketplaceCards(
  filters: FilterState,
  page: number,
  limit: number = 24,
) {
  // Récupère les sets pour les filtres
  const { data: sets } = useQuery<PokemonSetType[]>({
    queryKey: ["pokemon-sets"],
    queryFn: () => pokemonCardService.getAllSets(),
  });

  // Récupère les séries pour les filtres
  const { data: series } = useQuery<PokemonSerieType[]>({
    queryKey: ["pokemon-series"],
    queryFn: () => pokemonCardService.getAllSeries(),
  });

  // Récupère les cartes avec données marketplace
  const { data, isLoading, error } = usePaginatedQuery<PaginatedResult<any>>(
    [
      "marketplace-cards",
      page,
      filters.search,
      filters.setId,
      filters.serieId,
      filters.energyType,
      filters.rarity,
      filters.currency,
      filters.cardState,
      filters.language,
      filters.priceMin,
      filters.priceMax,
      filters.sortBy,
      filters.sortOrder,
      limit,
    ],
    marketplaceService.getCardsWithMarketplaceData,
    {
      page,
      limit,
      ...filters,
    },
  );

  return {
    sets,
    series,
    data,
    isLoading,
    error,
  };
}
