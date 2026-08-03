import { User } from "./auth";
import { Listing } from "./listing";

export enum OrderStatus {
  PENDING = "Pending",
  PAID = "Paid",
  SHIPPED = "Shipped",
  DELIVERED = "Delivered",
  CANCELLED = "Cancelled",
  REFUNDED = "Refunded",
}

/** Avancement de l'expédition, propre à chaque vendeur d'une commande. */
export enum FulfillmentStatus {
  TO_SHIP = "to_ship",
  PREPARING = "preparing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export interface OrderItem {
  id: number;
  /** Annonce d'origine, absente si elle a été supprimée depuis. */
  listing?: Listing | null;
  seller?: User | null;
  unitPrice: number;
  quantity: number;

  // Instantané figé au moment de l'achat : toujours renseigné.
  productKind: "card" | "sealed";
  productName: string;
  productImage: string | null;
  productCondition: string | null;
  productLanguage: string | null;
  productSetName: string | null;
  sellerName: string;

  fulfillmentStatus: FulfillmentStatus;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface Order {
  id: number;
  buyer: User;
  totalAmount: number;
  status: OrderStatus;
  currency: string;
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
}

/** Une ligne vendue, telle que la voit le vendeur dans son espace. */
export interface SellerSale extends OrderItem {
  order: Order;
}
