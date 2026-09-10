/**
 * Physical condition of a sealed product packaging.
 * Distinct from CardState as it applies exclusively to sealed boxes and packs.
 */
export enum SealedCondition {
  /** Factory sealed and undamaged */
  SEALED = "sealed",
  /** Packaging is damaged but internal contents remain intact */
  BOX_DAMAGED = "box_damaged",
  /** Opened and resealed (suspicious or altered) */
  OPENED_RESEALED = "opened_resealed",
}
