import { Order } from "@/types/order";
import { authedFetch } from "@/utils/fetch";

export interface StartCheckoutDto {
  shippingAddress: string;
}

/**
 * Réponse du checkout : la commande existe déjà côté serveur, avec son stock
 * réservé. Le paiement Stripe vient ensuite s'y rattacher.
 */
export interface CheckoutSession {
  orderId: number;
  clientSecret: string;
  amount: number;
  currency: string;
}

export const paymentService = {
  /**
   * Crée la commande, réserve le stock et ouvre le paiement associé.
   */
  async startCheckout(data: StartCheckoutDto): Promise<CheckoutSession> {
    return authedFetch<CheckoutSession>("POST", "/marketplace/checkout", {
      data,
    });
  },

  /**
   * Demande au serveur de confirmer la commande. Le serveur relit l'état réel
   * du paiement chez Stripe plutôt que de croire le client.
   */
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
