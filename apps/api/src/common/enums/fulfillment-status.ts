/**
 * Avancement de l'expédition d'une ligne de commande. Une commande peut
 * réunir plusieurs vendeurs : chacun avance sur ses propres lignes, sans
 * dépendre des autres.
 */
export enum FulfillmentStatus {
  /** Payée, en attente de préparation par le vendeur. */
  TO_SHIP = "to_ship",
  /** Le vendeur prépare le colis. */
  PREPARING = "preparing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  /** Ligne annulée (rupture, remboursement partiel). */
  CANCELLED = "cancelled",
}

/** Transitions autorisées côté vendeur. */
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
