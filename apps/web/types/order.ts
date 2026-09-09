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

export enum RefundStatus {
  PENDING = "pending",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
}

export enum ReturnStatus {
  REQUESTED = "requested",
  ACCEPTED = "accepted",
  RECEIVED = "received",
  REJECTED = "rejected",
}

export enum InventoryDisposition {
  PENDING_INSPECTION = "pending_inspection",
  RESTOCK = "restock",
  DAMAGED = "damaged",
  DISCARDED = "discarded",
}

export enum ClaimCategory {
  DAMAGED_ITEM = "damaged_item",
  MISSING_ITEM = "missing_item",
  WRONG_ITEM = "wrong_item",
  NON_DELIVERY = "non_delivery",
  GENERAL = "general",
}

export interface RefundLine {
  id: number;
  orderItemId: number;
  quantity: number;
  amount: number;
  createdAt: string;
}

export interface RefundOperation {
  id: number;
  orderId: number;
  stripeRefundId: string | null;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  createdAt: string;
  lines?: RefundLine[];
}

export interface ReturnItem {
  id: number;
  orderItemId: number;
  quantity: number;
  status: ReturnStatus;
  disposition: InventoryDisposition;
  reason: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
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
  returnItems?: ReturnItem[];
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
  refundOperations?: RefundOperation[];
}

export interface SellerSale extends OrderItem {
  order: Order;
}
