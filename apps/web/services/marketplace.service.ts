import { User } from "@/types/auth";
import type { CardPricing } from "@/types/cardPokemon";
import { PokemonCardType } from "@/types/cardPokemon";
import { Listing } from "@/types/listing";
import type { PaginatedResult, PaginationParams } from "@/types/pagination";
import { authedFetch, fetcher } from "@/utils/fetch";

export interface MarketplaceQueryParams extends PaginationParams {
  search?: string;
  cardState?: string;
  language?: string;
  status?: "active" | "inactive";
  currency?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  pokemonCardId?: string;
}

export interface CardMarketplaceQueryParams extends PaginationParams {
  search?: string;
  setId?: string;
  serieId?: string;
  energyType?: string;
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
  marketPricing: CardPricing | null;
}

export interface PriceSuggestion {
  cardId: string;
  cardState: string | null;
  currency: string;
  /** Suggested-price source, or null when no data is available. */
  basis: "same-state" | "all-states" | "market" | null;
  suggestedPrice: number | null;
  listings: {
    count: number;
    minPrice: number | null;
    maxPrice: number | null;
    avgPrice: number | null;
  };
  marketPrice: number | null;
}

export interface ShippingPolicy {
  handlingTimeDays: number;
  rates: Array<{
    productKind: "card" | "sealed";
    cost: number;
    label: string;
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
  seller: {
    id: number;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    isPro: boolean;
    createdAt: string;
  };
  totalListings: number;
  activeListings: number;
  totalSales: number;
  /** Null when the seller has no sale or sells in several currencies. */
  totalRevenue: number | null;
  /** Null when revenue cannot be expressed in a single currency. */
  avgOrderValue: number | null;
  currency: string | null;
  revenueByCurrency?: Record<string, number>;
  listings: Listing[];
}

export const marketplaceService = {
  /**
   * Retrieves paginated listings with filters and sorting.
   * @param params Query params (page, limit, search, cardState, currency, sortBy, sortOrder)
   */
  async getPaginated(
    params: MarketplaceQueryParams = {},
  ): Promise<PaginatedResult<Listing>> {
    return fetcher<PaginatedResult<Listing>>("/marketplace/listings", {
      params,
    });
  },

  /**
   * Retrieves a listing by its identifier.
   * @param id Listing identifier.
   */
  async getListingById(id: string): Promise<Listing> {
    return fetcher<Listing>(`/marketplace/listings/${id}`);
  },

  async createListing(data: Record<string, unknown>): Promise<Listing> {
    return authedFetch<Listing>("POST", "/marketplace/listings", { data });
  },

  /**
   * Retrieves the current user's listings.
   */
  async getMyListings(
    params: MarketplaceQueryParams = {},
  ): Promise<PaginatedResult<Listing>> {
    return authedFetch<PaginatedResult<Listing>>(
      "GET",
      "/marketplace/listings/my-listings",
      {
        params: params as any,
      },
    );
  },

  /**
   * Updates a listing.
   */
  async updateListing(id: string, data: Partial<Listing>): Promise<Listing> {
    return authedFetch<Listing>("PATCH", `/marketplace/listings/${id}`, {
      data,
    });
  },

  /**
   * Deletes a listing.
   */
  async deleteListing(id: string): Promise<void> {
    return authedFetch<void>("DELETE", `/marketplace/listings/${id}`);
  },

  /**
   * Retrieves cards with marketplace data.
   */
  async getCardsWithMarketplaceData(
    params: CardMarketplaceQueryParams = {},
  ): Promise<PaginatedResult<any>> {
    return fetcher<PaginatedResult<any>>("/marketplace/cards", { params });
  },

  /**
   * Retrieves a card's statistics.
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
   * Retrieves the suggested listing price for a card.
   */
  async getPriceSuggestion(
    cardId: string,
    cardState?: string,
    currency?: string,
  ): Promise<PriceSuggestion> {
    const params: Record<string, string> = {};
    if (currency) params.currency = currency;
    if (cardState) params.cardState = cardState;
    return fetcher<PriceSuggestion>(
      `/marketplace/cards/${cardId}/price-suggestion`,
      { params },
    );
  },

  /**
   * Retrieves the platform shipping policy.
   */
  async getShippingPolicy(): Promise<ShippingPolicy> {
    return fetcher<ShippingPolicy>("/marketplace/shipping-policy");
  },

  /**
   * Retrieves popular cards.
   */
  async getPopularCards(limit: number = 10): Promise<PopularCard[]> {
    return fetcher<PopularCard[]>("/marketplace/popular", {
      params: { limit },
    });
  },

  /**
   * Retrieves trending cards.
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
   * Retrieves top sellers.
   */
  async getBestSellers(limit: number = 10): Promise<BestSeller[]> {
    return fetcher<BestSeller[]>("/marketplace/best-sellers", {
      params: { limit },
    });
  },

  /**
   * Retrieves seller statistics.
   */
  async getSellerStatistics(sellerId: number): Promise<SellerStatistics> {
    return fetcher<SellerStatistics>(`/marketplace/sellers/${sellerId}`);
  },

  /**
   * Retrieves a seller's listings.
   */
  async getSellerListings(
    sellerId: number,
    query?: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC";
      productKind?: string;
    },
  ): Promise<PaginatedResult<Listing>> {
    return fetcher<PaginatedResult<Listing>>(
      `/marketplace/sellers/${sellerId}/listings`,
      { params: query },
    );
  },

  /**
   * Retrieves filtered listings for a specific card.
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
