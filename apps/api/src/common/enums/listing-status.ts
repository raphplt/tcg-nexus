/**
 * Intention du vendeur sur son annonce. La disponibilité réelle reste dérivée
 * du stock et de la date d'expiration : on ne stocke que ce que le vendeur
 * contrôle, pour éviter toute désynchronisation.
 */
export enum ListingStatus {
  /** Publiée et visible dans la marketplace. */
  ACTIVE = "active",
  /** Retirée de la vente par le vendeur, conservée dans son espace. */
  INACTIVE = "inactive",
}
