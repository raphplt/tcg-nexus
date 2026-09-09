/** Minimal shape the evolution analyzer needs from a deck entry. */
export interface EvolutionSourceCard {
  cardId: string;
  name?: string | null;
  /** Localized name of the card this one evolves from, when it evolves. */
  evolveFrom?: string | null;
  qty: number;
}

/** Why an evolution line was flagged. */
export type EvolutionLineIssue = "orphan" | "under-supported" | null;

/** One evolution step found in the deck, with the shape of its support. */
export interface EvolutionLine {
  /** Localized name of the pre-evolution. */
  base: string;
  /** Localized name of the evolved form. */
  evolution: string;
  /** Copies of the pre-evolution present in the deck. */
  baseQty: number;
  /** Copies of the evolved form present in the deck. */
  evolutionQty: number;
  issue: EvolutionLineIssue;
  cardIds: string[];
}

/**
 * Normalizes a card name for matching.
 *
 * `evolveFrom` and `name` both come from `card_translation`, so they only line
 * up when both were resolved in the same locale — the caller must have run
 * label resolution first. Diacritics and case are stripped because the printed
 * name and the printed `evolveFrom` are not always typed identically upstream.
 */
const normalize = (value?: string | null): string =>
  (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

/**
 * Reconstructs the evolution lines of a deck and flags the broken ones.
 *
 * A line is `under-supported` when the deck runs fewer pre-evolutions than
 * evolved forms — the evolved copies that exceed the base are dead cards — and
 * `orphan` when the pre-evolution is missing from the list entirely.
 *
 * @param cards Deck entries with localized labels already resolved.
 * @returns One entry per evolution step present in the deck.
 */
export function buildEvolutionLines(
  cards: EvolutionSourceCard[],
): EvolutionLine[] {
  const byName = new Map<
    string,
    { qty: number; label: string; ids: string[] }
  >();

  for (const card of cards) {
    const key = normalize(card.name);
    if (!key) continue;
    const entry = byName.get(key) ?? {
      qty: 0,
      label: card.name ?? key,
      ids: [],
    };
    entry.qty += card.qty;
    entry.ids.push(card.cardId);
    byName.set(key, entry);
  }

  const lines: EvolutionLine[] = [];

  for (const card of cards) {
    const baseKey = normalize(card.evolveFrom);
    if (!baseKey) continue;

    const base = byName.get(baseKey);
    const baseQty = base?.qty ?? 0;
    const evolutionQty = card.qty;

    lines.push({
      base: base?.label ?? (card.evolveFrom as string),
      evolution: card.name ?? card.cardId,
      baseQty,
      evolutionQty,
      issue:
        baseQty === 0
          ? "orphan"
          : baseQty < evolutionQty
            ? "under-supported"
            : null,
      cardIds: [...(base?.ids ?? []), card.cardId],
    });
  }

  return lines.sort((a, b) => a.evolution.localeCompare(b.evolution));
}
