import { Order } from "@/types/order";
import { authedFetch } from "@/utils/fetch";

export interface StartCheckoutDto {
  shippingAddress: string;
}

export interface CheckoutSession {
  orderId: number;
  clientSecret: string;
  amount: number;
  shippingAmount: number;
  currency: string;
}

export const paymentService = {
  async startCheckout(data: StartCheckoutDto): Promise<CheckoutSession> {
    return authedFetch<CheckoutSession>("POST", "/marketplace/checkout", {
      data,
    });
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
