import { Currency } from "src/common/enums/currency";
import { ProductKind } from "src/common/enums/product-kind";

/**
 * Snapshot of an order line for pending checkout inspection and payment summary.
 */
export class PendingCheckoutItemDto {
  id: number;
  productName: string;
  productImage: string | null;
  productCondition: string | null;
  productSetName: string | null;
  productKind: ProductKind;
  quantity: number;
  unitPrice: number;
}

/**
 * Authoritative session payload returned when resuming an in-progress pending checkout.
 */
export class PendingCheckoutSessionDto {
  orderId: number;
  clientSecret: string | null;
  amount: number;
  shippingAmount: number;
  currency: Currency;
  shippingAddress: string;
  reservationExpiresAt: Date | null;
  items: PendingCheckoutItemDto[];
}
