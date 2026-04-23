import { Listing } from "@/types/listing";
import { PaginatedResult, PaginationParams } from "@/types/pagination";
import {
  SealedCondition,
  SealedProduct,
  SealedProductType,
} from "@/types/sealed-product";
import { authedFetch, fetcher } from "@/utils/fetch";

export enum SealedSortBy {
  RECENT = "recent",
  POPULARITY = "popularity",
  PRICE_ASC = "priceAsc",
  PRICE_DESC = "priceDesc",
  NAME = "name",
}

export interface SealedProductFilters extends PaginationParams {
  setId?: string;
  seriesId?: string;
  productType?: SealedProductType;
  search?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy?: SealedSortBy;
}

export interface SealedProductStatistics {
  sealedProductId: string;
  totalListings: number;
  totalStock: number;
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
  priceHistory: Array<{
    price: number;
    currency: string;
    recordedAt: Date | string;
  }>;
}

export const sealedProductService = {
  async getAll(filters: SealedProductFilters = {}): Promise<SealedProduct[]> {
    return fetcher<SealedProduct[]>("/sealed-products", { params: filters });
  },

  async getPaginated(
    filters: SealedProductFilters = {},
  ): Promise<PaginatedResult<SealedProduct>> {
    return fetcher<PaginatedResult<SealedProduct>>(
      "/sealed-products/paginated",
      { params: filters },
    );
  },

  async getById(id: string): Promise<SealedProduct> {
    return fetcher<SealedProduct>(`/sealed-products/${id}`);
  },

  async getRecent(limit: number = 8): Promise<SealedProduct[]> {
    return fetcher<SealedProduct[]>("/sealed-products/recent", {
      params: { limit },
    });
  },

  async getPopular(limit: number = 8): Promise<SealedProduct[]> {
    return fetcher<SealedProduct[]>("/sealed-products/popular", {
      params: { limit },
    });
  },

  async getStatistics(id: string): Promise<SealedProductStatistics> {
    return fetcher<SealedProductStatistics>(`/sealed-products/${id}/stats`);
  },

  async getListings(
    sealedProductId: string,
  ): Promise<PaginatedResult<Listing>> {
    return fetcher<PaginatedResult<Listing>>("/listings", {
      params: { sealedProductId, productKind: "sealed" },
    });
  },

  async createListing(payload: {
    sealedProductId: string;
    price: number;
    currency: string;
    quantityAvailable?: number;
    sealedCondition?: SealedCondition;
    description?: string;
  }): Promise<Listing> {
    return authedFetch<Listing>("POST", "/marketplace/listings", {
      data: { ...payload, productKind: "sealed" },
    });
  },

  async addToCollection(
    collectionId: string,
    sealedProductId: string,
    sealedCondition: SealedCondition = SealedCondition.SEALED,
  ): Promise<unknown> {
    return authedFetch(
      "POST",
      `/collection-item/collection/${collectionId}/sealed`,
      {
        data: { sealedProductId, sealedCondition },
      },
    );
  },

  async addToWishlist(
    userId: number | string,
    sealedProductId: string,
  ): Promise<unknown> {
    return authedFetch("POST", `/collection-item/wishlist/${userId}/sealed`, {
      data: { sealedProductId },
    });
  },
};
