import { Listing } from "./listing";

export interface CartItem {
  id: number;
  cart?: UserCart;
  listing: Listing;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCart {
  id: number;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
  cartItems: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCartItemDto {
  listingId: number;
  quantity: number;
}

export interface UpdateCartItemDto {
  quantity?: number;
}

