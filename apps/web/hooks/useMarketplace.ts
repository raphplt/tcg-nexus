import { useQuery } from "@tanstack/react-query";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import {
  BestSeller,
  marketplaceService,
  PopularCard,
  TrendingCard,
} from "@/services/marketplace.service";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { sealedProductService } from "@/services/sealed-product.service";
import { PokemonSerieType, PokemonSetType } from "@/types/cardPokemon";
import { PaginatedResult } from "@/types/pagination";
import type { SealedProduct } from "@/types/sealed-product";
import { Listing } from "@/types/listing";

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

  // Récupère les sets (limité aux 50 plus récents)
  const { data: sets, isLoading: loadingSets } = useQuery<PokemonSetType[]>({
    queryKey: ["pokemon-sets", 50],
    queryFn: () => pokemonCardService.getAllSets(50),
  });

  // Récupère les produits scellés récents (par createdAt desc)
  const { data: recentSealed, isLoading: loadingRecentSealed } = useQuery<
    SealedProduct[]
  >({
    queryKey: ["sealed-products", "recent", 8],
    queryFn: () => sealedProductService.getRecent(8),
  });

  // Récupère les produits scellés populaires (par score d'événements)
  const { data: popularSealed, isLoading: loadingPopularSealed } = useQuery<
    SealedProduct[]
  >({
    queryKey: ["sealed-products", "popular", 8],
    queryFn: () => sealedProductService.getPopular(8),
  });

  // Récupère les dernières annonces créées
  const { data: recentListings, isLoading: loadingRecentListings } = useQuery<
    PaginatedResult<Listing>
  >({
    queryKey: ["marketplace", "recent-listings", 5],
    queryFn: () =>
      marketplaceService.getPaginated({
        page: 1,
        limit: 5,
        sortBy: "createdAt",
        sortOrder: "DESC",
      }),
  });

  return {
    popularCards,
    trendingCards,
    bestSellers,
    sets,
    sealedProducts: recentSealed,
    popularSealed,
    recentListings,
    loadingPopular,
    loadingTrending,
    loadingSellers,
    loadingSets,
    loadingSealed: loadingRecentSealed,
    loadingPopularSealed,
    loadingRecentListings,
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
