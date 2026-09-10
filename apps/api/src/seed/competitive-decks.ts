import presets from "./data/competitive-decks.json";

/** Exact catalog print and quantity recorded in a tournament decklist. */
export interface CompetitiveDeckCardPreset {
  tcgDexId: string;
  name: string;
  qty: number;
  sourceSet: string;
  sourceNumber: string;
}

/** Attributed tournament list with stable catalog identifiers, never database UUIDs. */
export interface CompetitiveDeckPreset {
  key: string;
  name: string;
  format: string;
  coverTcgDexId: string;
  source: {
    url: string;
    tournament: string;
    date: string;
    player: string;
    placement: number;
    format: string;
    retrievedAt: string;
  };
  cards: CompetitiveDeckCardPreset[];
}

/** Ten historical Worlds 2025 lists; their format describes the event, not current legality. */
export const COMPETITIVE_DECK_PRESETS: readonly CompetitiveDeckPreset[] =
  presets;

/**
 * Rejects malformed or incomplete presets before any database writes.
 *
 * @throws Error If a preset has invalid quantities, duplicate prints, or missing attribution.
 */
export function validateCompetitiveDeckPresets(
  deckPresets: readonly CompetitiveDeckPreset[],
): void {
  const keys = new Set<string>();
  const names = new Set<string>();
  for (const preset of deckPresets) {
    if (
      !preset.key ||
      keys.has(preset.key) ||
      !preset.name ||
      preset.name.length > 100 ||
      names.has(preset.name)
    ) {
      throw new Error(
        `Invalid or duplicate competitive deck identity: ${preset.key}`,
      );
    }
    keys.add(preset.key);
    names.add(preset.name);
    if (
      preset.format !== "Standard" ||
      !/^https:\/\/limitlesstcg\.com\/decks\/list\/\d+$/.test(
        preset.source.url,
      ) ||
      !preset.source.player ||
      !preset.source.tournament ||
      !Number.isInteger(preset.source.placement) ||
      preset.source.placement < 1 ||
      !Number.isFinite(Date.parse(preset.source.date))
    ) {
      throw new Error(`Invalid tournament attribution: ${preset.key}`);
    }
    const prints = new Set<string>();
    for (const entry of preset.cards) {
      if (
        !entry.tcgDexId ||
        prints.has(entry.tcgDexId) ||
        !entry.name ||
        !entry.sourceSet ||
        !entry.sourceNumber ||
        !Number.isInteger(entry.qty) ||
        entry.qty < 1 ||
        entry.qty > 60
      ) {
        throw new Error(
          `Invalid card entry in ${preset.key}: ${entry.tcgDexId}`,
        );
      }
      prints.add(entry.tcgDexId);
    }
    if (preset.cards.reduce((total, entry) => total + entry.qty, 0) !== 60) {
      throw new Error(
        `Competitive deck ${preset.key} must contain exactly 60 cards.`,
      );
    }
    if (!prints.has(preset.coverTcgDexId)) {
      throw new Error(`Cover card is not in competitive deck ${preset.key}.`);
    }
  }
}

/** Parses an optional explicit owner without silently falling back on invalid configuration. */
export function parseCompetitiveDeckOwnerId(
  value: unknown,
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (
    !/^\d+$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1
  ) {
    throw new Error("SEED_DECK_OWNER_ID must be a positive integer.");
  }
  return Number(value);
}
