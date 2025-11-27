import type { PaginationParams, PaginatedResult } from "@/types/pagination";
import { Listing } from "@/types/listing";
import { fetcher, authedFetch } from "@/utils/fetch";
import { PokemonCardType } from "@/types/cardPokemon";
import { User } from "@/types/auth";

export interface MarketplaceQueryParams extends PaginationParams {
  search?: string;
  cardState?: string;
  currency?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  pokemonCardId?: string;
}

export interface CardMarketplaceQueryParams extends PaginationParams {
  search?: string;
  setId?: string;
  serieId?: string;
  rarity?: string;
  currency?: string;
  cardState?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface CardStatistics {
  cardId: string;
  totalListings: number;
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
  currency: string | null;
  priceHistory: Array<{
    price: number;
    currency: string;
    recordedAt: Date;
  }>;
}

export interface PopularCard {
  card: PokemonCardType;
  listingCount: number;
  minPrice: number;
  avgPrice: number;
}

export interface TrendingCard {
  card: PokemonCardType;
  trendScore: number;
  listingCount: number;
  minPrice: number;
}

export interface BestSeller {
  seller: User;
  totalSales: number;
  totalRevenue: number;
}

export interface SellerStatistics {
  sellerId: number;
  totalListings: number;
  activeListings: number;
  totalSales: number;
  totalRevenue: number;
  avgOrderValue: number;
  listings: Listing[];
}

export const marketplaceService = {
  /**
   * Récupère les listings paginés avec filtres et tri
   * @param params Query params (page, limit, search, cardState, currency, sortBy, sortOrder)
   */
  async getPaginated(
    params: MarketplaceQueryParams = {},
  ): Promise<PaginatedResult<Listing>> {
    return fetcher<PaginatedResult<Listing>>("/listings", { params });
  },

  /**
   * Récupère un listing par son ID
   * @param id ID du listing
   */
  async getListingById(id: string): Promise<Listing> {
    return fetcher<Listing>(`/listings/${id}`);
  },

  /**
   * Récupère les listings de l'utilisateur connecté
   */
  async getMyListings(
    params: MarketplaceQueryParams = {},
  ): Promise<PaginatedResult<Listing>> {
    return authedFetch<PaginatedResult<Listing>>(
      "GET",
      "/listings/my-listings",
      {
        params: params as any,
      },
    );
  },

  /**
   * Met à jour un listing
   */
  async updateListing(id: string, data: Partial<Listing>): Promise<Listing> {
    return authedFetch<Listing>("PATCH", `/listings/${id}`, { data });
  },

  /**
   * Supprime un listing
   */
  async deleteListing(id: string): Promise<void> {
    return authedFetch<void>("DELETE", `/listings/${id}`);
  },

  /**
   * Récupère les cartes avec données marketplace
   */
  async getCardsWithMarketplaceData(
    params: CardMarketplaceQueryParams = {},
  ): Promise<PaginatedResult<any>> {
    return fetcher<PaginatedResult<any>>("/marketplace/cards", { params });
  },

  /**
   * Récupère les statistiques d'une carte
   */
  async getCardStatistics(
    cardId: string,
    currency?: string,
    cardState?: string,
  ): Promise<CardStatistics> {
    const params: Record<string, string> = {};
    if (currency) params.currency = currency;
    if (cardState) params.cardState = cardState;
    return fetcher<CardStatistics>(`/marketplace/cards/${cardId}/stats`, {
      params,
    });
  },

  /**
   * Récupère les cartes populaires
   */
  async getPopularCards(limit: number = 10): Promise<PopularCard[]> {
    return fetcher<PopularCard[]>("/marketplace/popular", {
      params: { limit },
    });
  },

  /**
   * Récupère les cartes en tendance
   */
  async getTrendingCards(
    limit: number = 10,
    excludePopular?: boolean,
  ): Promise<TrendingCard[]> {
    return fetcher<TrendingCard[]>("/marketplace/trending", {
      params: { limit, excludePopular },
    });
  },

  /**
   * Récupère les meilleurs vendeurs
   */
  async getBestSellers(limit: number = 10): Promise<BestSeller[]> {
    return fetcher<BestSeller[]>("/marketplace/best-sellers", {
      params: { limit },
    });
  },

  /**
   * Récupère les statistiques d'un vendeur
   */
  async getSellerStatistics(sellerId: number): Promise<SellerStatistics> {
    return fetcher<SellerStatistics>(`/marketplace/sellers/${sellerId}`);
  },

  /**
   * Récupère les listings d'un vendeur
   */
  async getSellerListings(sellerId: number): Promise<Listing[]> {
    return fetcher<Listing[]>(`/marketplace/sellers/${sellerId}/listings`);
  },

  /**
   * Récupère les listings pour une carte spécifique avec filtres
   */
  async getCardListings(
    cardId: string,
    filters?: {
      currency?: string;
      cardState?: string;
      limit?: number;
    },
  ): Promise<PaginatedResult<Listing>> {
    return this.getPaginated({
      pokemonCardId: cardId,
      currency: filters?.currency,
      cardState: filters?.cardState,
      limit: filters?.limit || 50,
    });
  },
};
