import {
  Currency,
  CardState,
  OrderStatus,
  PaymentMethod,
  PaymentStatus
} from '../entities';

export class CreateListingDto {
  sellerId: number;
  pokemonCardId: string;
  price: number;
  currency: Currency;
  quantityAvailable?: number;
  cardState: CardState;
  expiresAt?: Date;
}

export class CreateOrderDto {
  buyerId: number;
  totalAmount: number;
  currency: Currency;
  status: OrderStatus;
  orderItems: CreateOrderItemDto[];
}

export class CreateOrderItemDto {
  listingId: number;
  unitPrice: number;
  quantity: number;
}

export class CreatePaymentTransactionDto {
  orderId: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  amount: number;
}
