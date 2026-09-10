import { type BoosterCard, RarityTier } from "@/types/mini-game";
import { cardMarketValue, roundPrice } from "./pricing";

/** Translation key (namespace `CaseOpening`) of a tier label. */
export const TIER_LABEL_KEYS: Record<RarityTier, string> = {
  [RarityTier.Common]: "tierCommon",
  [RarityTier.Uncommon]: "tierUncommon",
  [RarityTier.Rare]: "tierRare",
  [RarityTier.Holo]: "tierHolo",
  [RarityTier.Ultra]: "tierUltra",
  [RarityTier.Secret]: "tierSecret",
};

/** Tailwind classes of a tier badge, brighter as the tier goes up. */
export const TIER_BADGE_CLASSES: Record<RarityTier, string> = {
  [RarityTier.Common]: "border-border bg-muted text-muted-foreground",
  [RarityTier.Uncommon]: "border-border bg-muted text-foreground",
  [RarityTier.Rare]: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  [RarityTier.Holo]:
    "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  [RarityTier.Ultra]:
    "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400",
  [RarityTier.Secret]:
    "border-rose-500/40 bg-gradient-to-r from-rose-500/20 to-amber-500/20 text-rose-600 dark:text-rose-300",
};

/** A "hit" is any card from the holo tier up: the ones worth celebrating. */
export function isHit(card: Pick<BoosterCard, "rarityTier">): boolean {
  return (card.rarityTier ?? RarityTier.Common) >= RarityTier.Holo;
}

/** Market value of a booster card; a card without price counts for nothing. */
export function cardValue(card: BoosterCard): number {
  return cardMarketValue(card) ?? 0;
}

/** Total market value of a pack, rounded to the cent. */
export function packValue(cards: BoosterCard[]): number {
  return roundPrice(cards.reduce((sum, card) => sum + cardValue(card), 0));
}

/** The most valuable card of a list, or `null` when empty. */
export function bestPull(cards: BoosterCard[]): BoosterCard | null {
  let best: BoosterCard | null = null;
  for (const card of cards) {
    if (best === null || cardValue(card) > cardValue(best)) best = card;
  }
  return best;
}
