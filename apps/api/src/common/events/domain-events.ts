/**
 * Contract shared by every domain event producer and consumer (FND-03).
 *
 * The map is the single source of truth for event names and payload shapes: an
 * emitter using an unknown name, or a payload missing a field its consumer
 * reads, fails to compile instead of being dispatched to nobody.
 */
export interface DomainEventPayloads {
  "order.created": {
    orderId: number;
    buyerId: number | null;
    totalAmount: number;
    currency: string;
  };
  "order.paid": {
    orderId: number;
    buyerId: number | null;
    amount: number;
    currency: string;
  };
  "order.shipped": {
    orderId: number;
    previousStatus: string;
    nextStatus: string;
  };
  "order.delivered": {
    orderId: number;
    previousStatus: string;
    nextStatus: string;
  };
  "order.cancelled": {
    orderId: number;
    buyerId?: number | null;
    previousStatus?: string;
    nextStatus?: string;
  };
  "order.refunded": {
    orderId: number;
    previousStatus: string;
    nextStatus: string;
  };
  "order.pending": {
    orderId: number;
    previousStatus: string;
    nextStatus: string;
  };
  "order.refund_created": {
    orderId: number;
    buyerUserId: number;
    refundOperationId: string;
    amount: number;
    currency: string;
    reason: string | null;
  };
  "order.return_requested": {
    returnItemId: string;
    orderId: number;
    orderItemId: number;
    sellerUserId: number | null;
    quantity: number;
    reason: string;
  };
  "order.item_delivered": {
    orderId: number;
    orderItemId: number;
    sellerUserId: number | null;
    buyerId: number;
    deliveredAt: Date | string | null;
  };
  "order.item_claim_created": {
    ticketId: number;
    orderId: number;
    orderItemId: number;
    claimCategory: string;
    buyerId: number;
    sellerUserId: number | null;
  };
  "return.disposition_set": {
    returnId: string;
    disposition: string;
    quantity: number;
    restockedQuantity: number;
  };
  "payment.compensation_required": {
    paymentId: number;
    orderId: number | null;
    buyerUserId: number | null;
    amount: number;
    currency: string | null;
    reason: string;
  };
}

/** Name of a contracted domain event. */
export type DomainEventType = keyof DomainEventPayloads;

/**
 * Envelope a consumer receives: the durable event identity plus its payload.
 *
 * The identity is what makes a consumer idempotent across redeliveries.
 */
export type DomainEventEnvelope<T extends DomainEventType> =
  DomainEventPayloads[T] & {
    eventId: string;
    aggregateType: string;
    aggregateId: string;
  };

/** Order status transitions that publish an event under a contracted name. */
const ORDER_STATUS_EVENTS: Record<string, DomainEventType> = {
  pending: "order.pending",
  paid: "order.paid",
  shipped: "order.shipped",
  delivered: "order.delivered",
  cancelled: "order.cancelled",
  refunded: "order.refunded",
};

/**
 * Resolves the contracted event name of an order status transition.
 *
 * @param status - Order status the transition moved to.
 * @returns The contracted event name.
 * @throws Error When a status has no declared event, which a new status must add.
 */
export function orderStatusEvent(status: string): DomainEventType {
  const event = ORDER_STATUS_EVENTS[status.toLowerCase()];
  if (!event) {
    throw new Error(`No domain event declared for order status ${status}`);
  }
  return event;
}
