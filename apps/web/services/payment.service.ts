import { Order } from "@/types/order";
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
};
