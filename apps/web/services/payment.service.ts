import { authedFetch } from "@/utils/fetch";

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  amount: number;
  currency: string;
}

export interface CreateOrderDto {
  paymentIntentId: string;
  shippingAddress: string;
}

export const paymentService = {
  async createPaymentIntent(): Promise<CreatePaymentIntentResponse> {
    return authedFetch<CreatePaymentIntentResponse>(
      "POST",
      "/payments/create-payment-intent",
      {
        data: {},
      },
    );
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
