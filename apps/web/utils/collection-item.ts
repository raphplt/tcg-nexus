import type { CollectionItemType } from "@/types/collection";
import { getCardImage } from "@/utils/images";
import { getSealedImageUrl } from "@/utils/sealedImage";

/**
 * Resolves presentation fields without treating sealed products as cards.
 *
 * @param item - A card (including legacy placeholders) or sealed inventory item.
 * @returns Catalog link, artwork and product-specific metadata; absent condition stays unknown.
 */
export function getCollectionItemDisplay(item: CollectionItemType) {
  if (item.productKind === "sealed") {
    const product = item.sealedProduct;
    return {
      kind: "sealed" as const,
      id: product.id,
      name: product.name,
      image: getSealedImageUrl(product) ?? "/images/sealed-placeholder.svg",
      href: `/marketplace/sealed/${product.id}`,
      set: product.pokemonSet,
      condition: item.sealedCondition,
      rarity: undefined,
      hp: undefined,
    };
  }
  const card = item.pokemonCard;
  return {
    kind: "card" as const,
    id: card.id,
    name: card.name,
    image: getCardImage(card, "low"),
    href: `/marketplace/cards/${card.id}`,
    set: card.set,
    condition: item.cardState?.name,
    rarity: card.rarity,
    hp: card.hp,
  };
}
