import { useQuery } from "@tanstack/react-query";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import {
  BestSeller,
  marketplaceService,
  PopularCard,
  PriceSuggestion,
  ShippingPolicy,
  TrendingCard,
} from "@/services/marketplace.service";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { sealedProductService } from "@/services/sealed-product.service";
import { PokemonSerieType, PokemonSetType } from "@/types/cardPokemon";
import { Listing } from "@/types/listing";
import { PaginatedResult } from "@/types/pagination";
import type { SealedProduct } from "@/types/sealed-product";

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
 * Provides the marketplace home page data.
 */
export function useMarketplaceHome() {
  const { data: popularCards, isLoading: loadingPopular } = useQuery<
    PopularCard[]
  >({
    queryKey: ["marketplace", "popular"],
    queryFn: () => marketplaceService.getPopularCards(8),
  });

  const { data: trendingCards, isLoading: loadingTrending } = useQuery<
    TrendingCard[]
  >({
    queryKey: ["marketplace", "trending"],
    queryFn: () => marketplaceService.getTrendingCards(8, true),
  });

  const { data: bestSellers, isLoading: loadingSellers } = useQuery<
    BestSeller[]
  >({
    queryKey: ["marketplace", "best-sellers"],
    queryFn: () => marketplaceService.getBestSellers(6),
  });

  const { data: sets, isLoading: loadingSets } = useQuery<PokemonSetType[]>({
    queryKey: ["pokemon-sets", 50],
    queryFn: () => pokemonCardService.getAllSets(50),
  });

  const { data: recentSealed, isLoading: loadingRecentSealed } = useQuery<
    SealedProduct[]
  >({
    queryKey: ["sealed-products", "recent", 8],
    queryFn: () => sealedProductService.getRecent(8),
  });

  const { data: popularSealed, isLoading: loadingPopularSealed } = useQuery<
    SealedProduct[]
  >({
    queryKey: ["sealed-products", "popular", 8],
    queryFn: () => sealedProductService.getPopular(8),
  });

  const { data: recentListings, isLoading: loadingRecentListings } = useQuery<
    PaginatedResult<Listing>
  >({
    queryKey: ["marketplace", "recent-listings", 8],
    queryFn: () =>
      marketplaceService.getPaginated({
        page: 1,
        limit: 8,
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
 * Provides marketplace card catalog data.
 */
export function useMarketplaceCards(
  filters: FilterState,
  page: number,
  limit: number = 24,
  enabled: boolean = true,
) {
  const { data: sets } = useQuery<PokemonSetType[]>({
    queryKey: ["pokemon-sets"],
    queryFn: () => pokemonCardService.getAllSets(),
  });

  const { data: series } = useQuery<PokemonSerieType[]>({
    queryKey: ["pokemon-series"],
    queryFn: () => pokemonCardService.getAllSeries(),
  });

  const { data, isLoading, error, refetch } = usePaginatedQuery<
    PaginatedResult<any>
  >(
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
    { enabled },
  );

  return {
    sets,
    series,
    data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Suggested listing price based on active listings, or the market reference price when none exist.
 */
export function usePriceSuggestion(
  cardId?: string,
  cardState?: string,
  currency?: string,
) {
  return useQuery<PriceSuggestion>({
    queryKey: ["marketplace", "price-suggestion", cardId, cardState, currency],
    queryFn: () =>
      marketplaceService.getPriceSuggestion(
        cardId as string,
        cardState,
        currency,
      ),
    enabled: Boolean(cardId),
  });
}

/** Platform-defined shipping policy. */
export function useShippingPolicy() {
  return useQuery<ShippingPolicy>({
    queryKey: ["marketplace", "shipping-policy"],
    queryFn: () => marketplaceService.getShippingPolicy(),
    staleTime: 1000 * 60 * 60,
  });
}
