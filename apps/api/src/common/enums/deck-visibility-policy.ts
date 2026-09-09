/**
 * Defines when submitted tournament decklists become visible to opponents and the public.
 */
export enum DeckVisibilityPolicy {
  ALWAYS_PRIVATE = "always_private",
  PUBLIC_ON_START = "public_on_start",
  PUBLIC_AFTER_EVENT = "public_after_event",
}
