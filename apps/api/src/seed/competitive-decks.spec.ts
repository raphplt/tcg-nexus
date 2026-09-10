import {
  COMPETITIVE_DECK_PRESETS,
  parseCompetitiveDeckOwnerId,
  validateCompetitiveDeckPresets,
} from "./competitive-decks";

describe("Worlds 2025 competitive deck presets", () => {
  it("ships ten attributed 60-card lists using 133 distinct catalog prints", () => {
    expect(COMPETITIVE_DECK_PRESETS).toHaveLength(10);
    expect(() =>
      validateCompetitiveDeckPresets(COMPETITIVE_DECK_PRESETS),
    ).not.toThrow();
    expect(
      new Set(
        COMPETITIVE_DECK_PRESETS.flatMap((deck) =>
          deck.cards.map((card) => card.tcgDexId),
        ),
      ).size,
    ).toBe(133);
    expect(
      new Set(COMPETITIVE_DECK_PRESETS.map((deck) => deck.source.url)).size,
    ).toBe(10);
    for (const deck of COMPETITIVE_DECK_PRESETS) {
      const copies = new Map<string, number>();
      for (const card of deck.cards) {
        expect(card.tcgDexId).toMatch(/^[a-z0-9.]+-\d{3}$/);
        copies.set(card.name, (copies.get(card.name) ?? 0) + card.qty);
      }
      for (const [name, quantity] of copies) {
        if (!name.endsWith(" Energy")) expect(quantity).toBeLessThanOrEqual(4);
      }
    }
  });

  it.each([0, -1, 1.5, NaN])("rejects invalid card quantity %s", (qty) => {
    const deck = structuredClone(COMPETITIVE_DECK_PRESETS[0]);
    deck.cards[0].qty = qty;
    expect(() => validateCompetitiveDeckPresets([deck])).toThrow();
  });

  it("rejects missing cards, duplicate prints, and covers outside the list", () => {
    const deck = structuredClone(COMPETITIVE_DECK_PRESETS[0]);
    expect(() =>
      validateCompetitiveDeckPresets([{ ...deck, cards: deck.cards.slice(1) }]),
    ).toThrow("60 cards");
    expect(() =>
      validateCompetitiveDeckPresets([
        { ...deck, cards: [...deck.cards, deck.cards[0]] },
      ]),
    ).toThrow("Invalid card entry");
    expect(() =>
      validateCompetitiveDeckPresets([{ ...deck, coverTcgDexId: "missing" }]),
    ).toThrow("Cover card");
  });

  it("rejects duplicate identities and unsourced lists", () => {
    const deck = COMPETITIVE_DECK_PRESETS[0];
    expect(() => validateCompetitiveDeckPresets([deck, deck])).toThrow(
      "duplicate",
    );
    expect(() =>
      validateCompetitiveDeckPresets([
        { ...deck, source: { ...deck.source, url: "" } },
      ]),
    ).toThrow("attribution");
  });

  it("validates owner configuration instead of silently choosing another user", () => {
    expect(parseCompetitiveDeckOwnerId(undefined)).toBeUndefined();
    expect(parseCompetitiveDeckOwnerId("42")).toBe(42);
    for (const value of [
      "not-an-id",
      -1,
      0,
      "1.5",
      "1e2",
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() => parseCompetitiveDeckOwnerId(value)).toThrow(
        "positive integer",
      );
    }
  });
});
