/**
 * État physique d'un produit scellé.
 * Distinct de CardState car ne s'applique pas aux cartes unitaires.
 */
export enum SealedCondition {
  /** Encore scellé d'usine */
  SEALED = "sealed",
  /** Boîte abîmée mais contenu intact */
  BOX_DAMAGED = "box_damaged",
  /** Ouvert puis re-scellé (rare, suspect) */
  OPENED_RESEALED = "opened_resealed",
}
