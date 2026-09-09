import type {
  ReceiptImportPreviewResponse,
  ReceiptImportRequest,
  ReceiptImportResult,
} from "@/types/delivery-receipt";
import { Order, OrderItem } from "@/types/order";
import { authedFetch } from "@/utils/fetch";

export interface StartCheckoutDto {
  shippingAddress: string;
  attemptKey?: string;
}

export interface CheckoutSession {
  orderId: number;
  clientSecret: string | null;
  amount: number;
  shippingAmount: number;
  currency: string;
}

export interface PendingCheckoutItem {
  id: number;
  productName: string;
  productImage: string | null;
  productCondition: string | null;
  productSetName: string | null;
  productKind: "card" | "sealed";
  quantity: number;
  unitPrice: number;
}

export interface PendingCheckoutSession extends CheckoutSession {
  shippingAddress: string;
  reservationExpiresAt: string | null;
  items: PendingCheckoutItem[];
}

export const paymentService = {
  async startCheckout(data: StartCheckoutDto): Promise<CheckoutSession> {
    return authedFetch<CheckoutSession>("POST", "/marketplace/checkout", {
      data,
    });
  },

  async getPendingCheckout(): Promise<PendingCheckoutSession | null> {
    try {
      return await authedFetch<PendingCheckoutSession | null>(
        "GET",
        "/marketplace/checkout/pending",
      );
    } catch {
      return null;
    }
  },

  async cancelPendingOrder(
    orderId: number,
  ): Promise<{ success: boolean; orderId: number }> {
    return authedFetch<{ success: boolean; orderId: number }>(
      "POST",
      `/marketplace/orders/${orderId}/cancel`,
    );
  },

  async confirmOrder(orderId: number): Promise<Order> {
    return authedFetch<Order>("POST", `/marketplace/orders/${orderId}/confirm`);
  },

  async getMyOrders(): Promise<Order[]> {
    return authedFetch<Order[]>("GET", "/marketplace/orders");
  },

  async getOrderById(id: number): Promise<Order> {
    return authedFetch<Order>("GET", `/marketplace/orders/${id}`);
  },

  async confirmItemReceipt(
    orderId: number,
    itemId: number,
  ): Promise<OrderItem> {
    return authedFetch<OrderItem>(
      "POST",
      `/marketplace/orders/${orderId}/items/${itemId}/confirm-receipt`,
    );
  },

  async createItemClaim(
    orderId: number,
    itemId: number,
    data: { claimCategory: string; subject: string; message: string },
  ): Promise<{ message: string; ticket: any }> {
    return authedFetch<{ message: string; ticket: any }>(
      "POST",
      `/marketplace/orders/${orderId}/items/${itemId}/claim`,
      { data },
    );
  },

  async getRefundBalance(orderId: number): Promise<{
    totalAmount: number;
    alreadyRefunded: number;
    remainingAmount: number;
  }> {
    return authedFetch(
      "GET",
      `/marketplace/orders/${orderId}/refunds/remaining`,
    );
  },

  /** Reuse requestKey after an ambiguous response; allocate a new key only for a new intentional refund. */
  async createRefund(
    orderId: number,
    data: {
      requestKey?: string;
      reason: string;
      amount?: number;
      lines?: Array<{
        orderItemId: number;
        quantity: number;
        amount: number;
        shippingAmount?: number;
      }>;
    },
  ): Promise<any> {
    return authedFetch("POST", `/marketplace/orders/${orderId}/refund`, {
      data,
    });
  },

  async createReturn(
    orderId: number,
    itemId: number,
    data: {
      quantity: number;
      reason: string;
    },
  ): Promise<any> {
    return authedFetch(
      "POST",
      `/marketplace/orders/${orderId}/items/${itemId}/returns`,
      { data },
    );
  },

  async setDisposition(
    returnId: number | string,
    data: {
      disposition: string;
      notes?: string;
    },
  ): Promise<any> {
    return authedFetch(
      "PATCH",
      `/marketplace/returns/${returnId}/disposition`,
      { data },
    );
  },

  async getReceiptImportPreview(
    orderId: number,
  ): Promise<ReceiptImportPreviewResponse> {
    return authedFetch<ReceiptImportPreviewResponse>(
      "GET",
      `/marketplace/orders/${orderId}/receipt-preview`,
    );
  },

  async importToCollection(
    orderId: number,
    data: ReceiptImportRequest,
  ): Promise<ReceiptImportResult> {
    return authedFetch<ReceiptImportResult>(
      "POST",
      `/marketplace/orders/${orderId}/import-to-collection`,
      { data },
    );
  },
};
