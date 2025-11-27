import { Listing } from "./listing";
import { User } from "./auth";

export enum OrderStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  SHIPPED = 'Shipped',
  CANCELLED = 'Cancelled',
  REFUNDED = 'Refunded'
}

export interface OrderItem {
  id: number;
  listing: Listing;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: number;
  buyer: User;
  totalAmount: number;
  status: OrderStatus;
  currency: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
}
