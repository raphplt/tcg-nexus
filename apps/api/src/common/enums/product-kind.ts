/**
 * Discriminator pour distinguer les éléments de collection ou de marketplace
 * portant sur une carte unitaire vs un produit scellé.
 */
export enum ProductKind {
  CARD = "card",
  SEALED = "sealed",
}
