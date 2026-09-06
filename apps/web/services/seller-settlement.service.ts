import type { PaginatedResult, PaginationParams } from "@/types/pagination";
import type {
  AdminProcessPayoutDto,
  RequestPayoutDto,
  SellerAllocation,
  SellerPayout,
  SellerSettlementAccount,
  SellerSettlementSummary,
  UpdatePayoutSettingsDto,
} from "@/types/seller-settlement";
import { authedFetch } from "@/utils/fetch";

export const sellerSettlementService = {
  /**
   * Retrieves high-level escrow, balances, and payout configuration summary for current seller.
   */
  async getSummary(): Promise<SellerSettlementSummary> {
    return authedFetch<SellerSettlementSummary>(
      "GET",
      "/marketplace/seller/settlement/summary",
    );
  },

  /**
   * Updates payout preferences and bank details for current seller.
   */
  async updateSettings(
    data: UpdatePayoutSettingsDto,
  ): Promise<SellerSettlementAccount> {
    return authedFetch<SellerSettlementAccount>(
      "PATCH",
      "/marketplace/seller/settlement/settings",
      { data },
    );
  },

  /**
   * Retrieves paginated order allocations ledger for current seller.
   */
  async getAllocations(
    params?: PaginationParams & { status?: string },
  ): Promise<PaginatedResult<SellerAllocation>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);

    const queryString = query.toString();
    const endpoint = `/marketplace/seller/settlement/allocations${queryString ? `?${queryString}` : ""}`;
    return authedFetch<PaginatedResult<SellerAllocation>>("GET", endpoint);
  },

  /**
   * Retrieves paginated payout history for current seller.
   */
  async getPayouts(
    params?: PaginationParams & { status?: string },
  ): Promise<PaginatedResult<SellerPayout>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);

    const queryString = query.toString();
    const endpoint = `/marketplace/seller/settlement/payouts${queryString ? `?${queryString}` : ""}`;
    return authedFetch<PaginatedResult<SellerPayout>>("GET", endpoint);
  },

  /**
   * Submits a payout disbursement request from available balance.
   */
  async requestPayout(data: RequestPayoutDto): Promise<SellerPayout> {
    return authedFetch<SellerPayout>(
      "POST",
      "/marketplace/seller/settlement/payouts",
      { data },
    );
  },

  /**
   * Administrator: List all platform payout disbursement requests.
   */
  async adminListPayouts(
    params?: PaginationParams & { status?: string },
  ): Promise<PaginatedResult<SellerPayout>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);

    const queryString = query.toString();
    const endpoint = `/marketplace/admin/payouts${queryString ? `?${queryString}` : ""}`;
    return authedFetch<PaginatedResult<SellerPayout>>("GET", endpoint);
  },

  /**
   * Administrator: Process, complete, or fail a payout request.
   */
  async adminProcessPayout(
    payoutId: number,
    data: AdminProcessPayoutDto,
  ): Promise<SellerPayout> {
    return authedFetch<SellerPayout>(
      "POST",
      `/marketplace/admin/payouts/${payoutId}/process`,
      { data },
    );
  },
};
