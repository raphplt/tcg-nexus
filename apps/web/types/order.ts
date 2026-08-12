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

export enum FulfillmentStatus {
  TO_SHIP = "to_ship",
  PREPARING = "preparing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export interface OrderItem {
  id: number;
  listing?: Listing | null;
  seller?: User | null;
  unitPrice: number;
  quantity: number;
  shippingCost: number;
  handlingTimeDays: number;

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
  shippingAmount: number;
  status: OrderStatus;
  currency: string;
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
}

export interface SellerSale extends OrderItem {
  order: Order;
}
