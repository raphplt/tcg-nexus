import { authedFetch, fetcher } from "@/utils/fetch";
import { PaginatedResult, PaginationParams } from "@/types/pagination";
import {
  SealedCondition,
  SealedProduct,
  SealedProductType,
} from "@/types/sealed-product";
import { Listing } from "@/types/listing";

export interface SealedProductFilters extends PaginationParams {
  setId?: string;
  productType?: SealedProductType;
  search?: string;
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

  async getListings(
    sealedProductId: string,
  ): Promise<PaginatedResult<Listing>> {
    return fetcher<PaginatedResult<Listing>>("/marketplace/listings", {
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
    return authedFetch("POST", `/collection-item/collection/${collectionId}/sealed`, {
      data: { sealedProductId, sealedCondition },
    });
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
