import { FulfillmentStatus, SellerSale } from "@/types/order";
import type { PaginatedResult } from "@/types/pagination";
import { authedFetch } from "@/utils/fetch";

export interface SellerRevenue {
  totalSales: number;
  revenueByCurrency: Record<string, number>;
}

export interface UpdateFulfillmentDto {
  fulfillmentStatus: FulfillmentStatus;
  carrier?: string;
  trackingNumber?: string;
}

export const salesService = {
  async getMySales(
    params: {
      page?: number;
      limit?: number;
      fulfillmentStatus?: FulfillmentStatus;
    } = {},
  ): Promise<PaginatedResult<SellerSale>> {
    return authedFetch<PaginatedResult<SellerSale>>(
      "GET",
      "/marketplace/sales",
      { params: params as Record<string, unknown> },
    );
  },

  async getMyRevenue(): Promise<SellerRevenue> {
    return authedFetch<SellerRevenue>("GET", "/marketplace/sales/revenue");
  },

  async updateFulfillment(
    orderItemId: number,
    data: UpdateFulfillmentDto,
  ): Promise<SellerSale> {
    return authedFetch<SellerSale>(
      "PATCH",
      `/marketplace/sales/${orderItemId}/fulfillment`,
      { data },
    );
  },
};
