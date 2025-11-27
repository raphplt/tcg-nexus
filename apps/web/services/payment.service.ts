import { authedFetch } from "@/utils/fetch";

export interface CreatePaymentIntentResponse {
  clientSecret: string;
}

export interface CreateOrderDto {
  paymentIntentId: string;
  shippingAddress: string;
}

export const paymentService = {
  async createPaymentIntent(amount: number, currency: string): Promise<CreatePaymentIntentResponse> {
    return authedFetch<CreatePaymentIntentResponse>("POST", "/payments/create-payment-intent", {
      data: { amount, currency },
    });
  },

  async createOrder(data: CreateOrderDto): Promise<any> {
    return authedFetch<any>("POST", "/marketplace/orders", { data });
  },

  async getMyOrders(): Promise<any[]> {
    return authedFetch<any[]>("GET", "/marketplace/orders");
  },

  async getOrderById(id: number): Promise<any> {
    return authedFetch<any>("GET", `/marketplace/orders/${id}`);
  },
};
