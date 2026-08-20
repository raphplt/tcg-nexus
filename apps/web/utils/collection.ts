import type { Collection, CollectionItemType } from "@/types/collection";
import type { PokemonCardType } from "@/types/cardPokemon";

/** Number of card artworks shown in a collection preview fan. */
export const COLLECTION_PREVIEW_SIZE = 3;

/**
 * Display name of a collection.
 *
 * Master Set names are derived from the linked extension rather than read from
 * the stored `name`: the extension name is localized in the reader's language,
 * and collections created before the label fix carry a broken stored name.
 *
 * @param collection - Collection to label.
 * @returns Name to display.
 */
export function getCollectionTitle(collection: Collection): string {
  const setName = collection.masterSet?.name?.trim();
  return setName ? `Master Set — ${setName}` : collection.name;
}

/**
 * Number of distinct cards actually owned in a collection. Master Set
 * collections are pre-filled with the whole extension, so rows with a zero
 * quantity stand for cards still missing.
 *
 * @param collection - Collection to measure.
 * @returns Count of owned cards.
 */
export function getOwnedCardCount(collection: Collection): number {
  return (collection.items ?? []).filter((item) => (item.quantity || 0) > 0)
    .length;
}

/**
 * Completion target of a collection: the full extension for a Master Set, the
 * number of tracked cards otherwise.
 *
 * @param collection - Collection to measure.
 * @returns Total number of cards to reach.
 */
export function getCollectionTarget(collection: Collection): number {
  return (
    collection.masterSet?.cardCount?.total ?? (collection.items ?? []).length
  );
}

/**
 * Completion ratio of a collection, capped at 100.
 *
 * @param collection - Collection to measure.
 * @returns Completion percentage.
 */
export function getCompletionPercent(collection: Collection): number {
  const target = getCollectionTarget(collection);
  if (target <= 0) return 0;
  return Math.min(
    100,
    Math.round((getOwnedCardCount(collection) / target) * 100),
  );
}

/**
 * Cards used to illustrate a collection. Only owned cards carrying an artwork
 * are kept: a few cards have no image, and picking the first rows blindly would
 * show a wall of card backs.
 *
 * @param collection - Collection to illustrate.
 * @param size - Maximum number of cards returned.
 * @returns Illustrated cards, in collection order.
 */
export function getPreviewCards(
  collection: Collection,
  size: number = COLLECTION_PREVIEW_SIZE,
): PokemonCardType[] {
  const items: CollectionItemType[] = collection.items ?? [];
  return items
    .filter((item) => (item.quantity || 0) > 0 && item.pokemonCard?.image)
    .slice(0, size)
    .map((item) => item.pokemonCard);
}
