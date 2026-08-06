export enum FulfillmentStatus {
  TO_SHIP = "to_ship",
  PREPARING = "preparing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export const FULFILLMENT_TRANSITIONS: Record<
  FulfillmentStatus,
  FulfillmentStatus[]
> = {
  [FulfillmentStatus.TO_SHIP]: [
    FulfillmentStatus.PREPARING,
    FulfillmentStatus.SHIPPED,
    FulfillmentStatus.CANCELLED,
  ],
  [FulfillmentStatus.PREPARING]: [
    FulfillmentStatus.SHIPPED,
    FulfillmentStatus.CANCELLED,
  ],
  [FulfillmentStatus.SHIPPED]: [FulfillmentStatus.DELIVERED],
  [FulfillmentStatus.DELIVERED]: [],
  [FulfillmentStatus.CANCELLED]: [],
};
