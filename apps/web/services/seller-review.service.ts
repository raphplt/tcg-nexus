import type { PaginatedResult, PaginationParams } from "@/types/pagination";
import type {
  CreateSellerReviewDto,
  SellerProfileSummary,
  SellerReview,
} from "@/types/seller-review";
import { authedFetch, fetcher } from "@/utils/fetch";

export const sellerReviewService = {
  /**
   * Retrieves trustworthy metrics and public seller profile summary.
   */
  async getSellerProfile(sellerId: number): Promise<SellerProfileSummary> {
    return fetcher<SellerProfileSummary>(
      `/marketplace/sellers/${sellerId}/profile`,
    );
  },

  /**
   * Retrieves paginated reviews for a specific seller.
   */
  async getSellerReviews(
    sellerId: number,
    params?: PaginationParams,
  ): Promise<PaginatedResult<SellerReview>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const queryString = query.toString();
    const endpoint = `/marketplace/sellers/${sellerId}/reviews${queryString ? `?${queryString}` : ""}`;
    return fetcher<PaginatedResult<SellerReview>>(endpoint);
  },

  /**
   * Creates a verified buyer review for a delivered order item.
   */
  async createReview(
    orderId: number,
    orderItemId: number,
    data: CreateSellerReviewDto,
  ): Promise<SellerReview> {
    return authedFetch<SellerReview>(
      "POST",
      `/marketplace/orders/${orderId}/items/${orderItemId}/review`,
      { data },
    );
  },
};
