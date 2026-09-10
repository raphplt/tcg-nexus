/**
 * Booster composition of the Case Opening mini-game.
 *
 * Pure rules, free of Nest and TypeORM: how localized rarity labels group into
 * tiers, what each pack style contains, and how a pack is drawn from per-tier
 * pools. The service only supplies the pools.
 */

/** Rarity tiers, from least to most desirable. */
export enum RarityTier {
  Common = 0,
  Uncommon = 1,
  Rare = 2,
  Holo = 3,
  Ultra = 4,
  Secret = 5,
}

export const RARITY_TIERS: RarityTier[] = [
  RarityTier.Common,
  RarityTier.Uncommon,
  RarityTier.Rare,
  RarityTier.Holo,
  RarityTier.Ultra,
  RarityTier.Secret,
];

/**
 * Localized rarity labels per tier, French and English, as found in
 * `card_translation.rarity`. Cards carry no language-neutral rarity code, so
 * the mapping has to know every label. Matching is case-insensitive.
 */
export const RARITY_LABELS: Record<RarityTier, string[]> = {
  [RarityTier.Common]: ["Common", "Commune"],
  [RarityTier.Uncommon]: ["Uncommon", "Peu Commune", "None", "Sans Rareté"],
  [RarityTier.Rare]: ["Rare", "Promo"],
  [RarityTier.Holo]: [
    "Rare Holo",
    "Holo Rare",
    "Double rare",
    "Holo Rare V",
    "Holo Rare VMAX",
    "Holo Rare VSTAR",
    "Rare Holo LV.X",
    "Rare PRIME",
    "Rare Prime",
    "Radiant Rare",
    "Radieux Rare",
    "Amazing Rare",
    "Magnifique",
    "ACE SPEC Rare",
    "HIGH-TECG rare",
    "LEGEND",
    "LÉGENDE",
    "Classic Collection",
    "Collection Classique",
    "Black White Rare",
    "Rare Noir Blanc",
  ],
  [RarityTier.Ultra]: [
    "Ultra Rare",
    "Illustration rare",
    "Full Art Trainer",
    "Dresseur Full Art",
    "Shiny rare",
    "Shiny rare V",
    "Shiny rare VMAX",
  ],
  [RarityTier.Secret]: [
    "Secret Rare",
    "Magnifique rare",
    "Special illustration rare",
    "Illustration spéciale rare",
    "Hyper rare",
    "Mega Hyper Rare",
    "Méga Hyper Rare",
    "Shiny Ultra Rare",
    "Chromatique ultra rare",
  ],
};

const TIER_BY_LABEL = new Map<string, RarityTier>(
  RARITY_TIERS.flatMap((tier) =>
    RARITY_LABELS[tier].map((label) => [label.toLowerCase(), tier] as const),
  ),
);

/**
 * Tier of a localized rarity label, or `null` for an unknown label.
 */
export function rarityTier(label: string | null | undefined): RarityTier | null {
  if (!label) return null;
  return TIER_BY_LABEL.get(label.trim().toLowerCase()) ?? null;
}

/** Weighted tier distribution of one card slot. Weights need not sum to 1. */
export type SlotDistribution = Partial<Record<RarityTier, number>>;

export type PackStyle = "standard" | "premium" | "chase";

export const PACK_STYLES: PackStyle[] = ["standard", "premium", "chase"];

/**
 * Slot composition of each pack style.
 *
 * `standard` mimics a modern booster but trimmed to six cards and tilted
 * towards hits: two low slots, one uncommon, a rare, then two slots that can
 * each turn into a holo, an ultra or a secret. Real boosters bury the fun
 * under commons; a duel does not need that.
 *
 * `premium` has no common or uncommon at all. `chase` is three cards, every
 * one of them a hit, for high-variance duels.
 */
export const PACK_COMPOSITIONS: Record<PackStyle, SlotDistribution[]> = {
  standard: [
    { [RarityTier.Common]: 70, [RarityTier.Uncommon]: 30 },
    { [RarityTier.Common]: 60, [RarityTier.Uncommon]: 40 },
    { [RarityTier.Uncommon]: 100 },
    { [RarityTier.Rare]: 70, [RarityTier.Holo]: 30 },
    {
      [RarityTier.Rare]: 35,
      [RarityTier.Holo]: 40,
      [RarityTier.Ultra]: 20,
      [RarityTier.Secret]: 5,
    },
    { [RarityTier.Holo]: 45, [RarityTier.Ultra]: 35, [RarityTier.Secret]: 20 },
  ],
  premium: [
    { [RarityTier.Rare]: 100 },
    { [RarityTier.Holo]: 100 },
    { [RarityTier.Holo]: 60, [RarityTier.Ultra]: 40 },
    { [RarityTier.Ultra]: 100 },
    { [RarityTier.Ultra]: 60, [RarityTier.Secret]: 40 },
    { [RarityTier.Ultra]: 40, [RarityTier.Secret]: 60 },
  ],
  chase: [
    { [RarityTier.Holo]: 30, [RarityTier.Ultra]: 70 },
    { [RarityTier.Ultra]: 50, [RarityTier.Secret]: 50 },
    { [RarityTier.Secret]: 100 },
  ],
};

/** Number of cards in a pack of the given style. */
export function packSize(style: PackStyle): number {
  return PACK_COMPOSITIONS[style].length;
}

/** Cards available per tier for a draw. */
export type TierPools<T> = Record<RarityTier, T[]>;

export function emptyPools<T>(): TierPools<T> {
  return {
    [RarityTier.Common]: [],
    [RarityTier.Uncommon]: [],
    [RarityTier.Rare]: [],
    [RarityTier.Holo]: [],
    [RarityTier.Ultra]: [],
    [RarityTier.Secret]: [],
  };
}

/** Picks a tier at random according to the slot weights. */
export function pickTier(
  slot: SlotDistribution,
  random: () => number = Math.random,
): RarityTier {
  const entries = RARITY_TIERS.filter((tier) => (slot[tier] ?? 0) > 0);
  const total = entries.reduce((sum, tier) => sum + (slot[tier] as number), 0);
  let cursor = random() * total;
  for (const tier of entries) {
    cursor -= slot[tier] as number;
    if (cursor < 0) return tier;
  }
  return entries[entries.length - 1] ?? RarityTier.Common;
}

/**
 * Nearest tier that still has cards, preferring lower tiers: a set without
 * secret rares yields an ultra rare, never an empty slot.
 */
export function resolveTier<T>(
  wanted: RarityTier,
  pools: TierPools<T>,
): RarityTier | null {
  for (let distance = 0; distance < RARITY_TIERS.length; distance += 1) {
    const lower = (wanted - distance) as RarityTier;
    if (lower >= RarityTier.Common && pools[lower].length > 0) return lower;
    const higher = (wanted + distance) as RarityTier;
    if (higher <= RarityTier.Secret && pools[higher].length > 0) return higher;
  }
  return null;
}

/**
 * Draws one pack: for every slot, picks a tier by weight, resolves it to a
 * tier that has cards, then a random card of that tier. A card appears at
 * most once per pack while the tier pool allows it.
 *
 * @param pools Cards per tier.
 * @param style Pack style.
 * @param key Identity of a card, to avoid duplicates within a pack.
 * @param random Random source in `[0, 1)`, injectable for tests.
 * @returns The drawn cards, fewer than the pack size only when every pool is empty.
 */
export function drawPack<T>(
  pools: TierPools<T>,
  style: PackStyle,
  key: (card: T) => string,
  random: () => number = Math.random,
): T[] {
  const pack: T[] = [];
  const used = new Set<string>();

  for (const slot of PACK_COMPOSITIONS[style]) {
    const wanted = pickTier(slot, random);

    // Prefer any tier that still has unseen cards over repeating a card: a
    // tiny set with a single rare yields a holo rather than that rare twice.
    const unseen = emptyPools<T>();
    for (const tier of RARITY_TIERS) {
      unseen[tier] = pools[tier].filter((card) => !used.has(key(card)));
    }
    const fromUnseen = resolveTier(wanted, unseen);
    const tier = fromUnseen ?? resolveTier(wanted, pools);
    if (tier === null) break;

    const candidates = fromUnseen !== null ? unseen[tier] : pools[tier];
    const card = candidates[Math.floor(random() * candidates.length)];
    if (card === undefined) break;

    used.add(key(card));
    pack.push(card);
  }

  return pack;
}
