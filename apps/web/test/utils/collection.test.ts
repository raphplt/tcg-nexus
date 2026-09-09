import { describe, expect, it } from "vitest";
import {
  COLLECTION_PREVIEW_SIZE,
  getCollectionTarget,
  getCollectionTitle,
  getCompletionPercent,
  getOwnedCardCount,
  getPreviewCards,
} from "@/utils/collection";
import type { Collection, CollectionItemType } from "@/types/collection";
import type { PokemonCardType } from "@/types/cardPokemon";

describe("collection utils", () => {
  describe("getCollectionTitle", () => {
    it("returns formatted Master Set title when masterSet is present", () => {
      const col = {
        name: "Old Name",
        masterSet: { name: "151" },
      } as unknown as Collection;

      expect(getCollectionTitle(col)).toBe("Master Set — 151");
    });

    it("falls back to collection name when masterSet has empty or no name", () => {
      const col = {
        name: "My Vintage Collection",
        masterSet: { name: "   " },
      } as unknown as Collection;

      expect(getCollectionTitle(col)).toBe("My Vintage Collection");
    });

    it("returns collection name when masterSet is not present", () => {
      const col = {
        name: "Binder #1",
      } as unknown as Collection;

      expect(getCollectionTitle(col)).toBe("Binder #1");
    });
  });

  describe("getOwnedCardCount", () => {
    it("counts only items with quantity greater than 0", () => {
      const col = {
        items: [
          { id: 1, quantity: 2 },
          { id: 2, quantity: 0 },
          { id: 3, quantity: 1 },
          { id: 4, quantity: undefined },
        ] as CollectionItemType[],
      } as Collection;

      expect(getOwnedCardCount(col)).toBe(2);
    });

    it("returns 0 when items array is undefined or empty", () => {
      expect(getOwnedCardCount({} as unknown as Collection)).toBe(0);
      expect(getOwnedCardCount({ items: [] } as unknown as Collection)).toBe(0);
    });
  });

  describe("getCollectionTarget", () => {
    it("returns masterSet total cardCount when available", () => {
      const col = {
        masterSet: { cardCount: { total: 165 } },
        items: [{ id: 1 }] as CollectionItemType[],
      } as unknown as Collection;

      expect(getCollectionTarget(col)).toBe(165);
    });

    it("falls back to items length when not a masterSet", () => {
      const col = {
        items: [{ id: 1 }, { id: 2 }] as CollectionItemType[],
      } as unknown as Collection;

      expect(getCollectionTarget(col)).toBe(2);
    });

    it("returns 0 when items is undefined and masterSet is absent", () => {
      expect(getCollectionTarget({} as unknown as Collection)).toBe(0);
    });
  });

  describe("getCompletionPercent", () => {
    it("returns 0 when target is 0", () => {
      expect(getCompletionPercent({} as unknown as Collection)).toBe(0);
    });

    it("calculates rounded percentage capped at 100", () => {
      const col = {
        items: [
          { id: 1, quantity: 1 },
          { id: 2, quantity: 1 },
          { id: 3, quantity: 0 },
        ] as CollectionItemType[],
      } as Collection;

      // 2 owned out of 3 = 67%
      expect(getCompletionPercent(col)).toBe(67);
    });

    it("caps at 100 even if owned exceeds target", () => {
      const col = {
        masterSet: { cardCount: { total: 2 } },
        items: [
          { id: 1, quantity: 1 },
          { id: 2, quantity: 1 },
          { id: 3, quantity: 1 },
        ] as CollectionItemType[],
      } as unknown as Collection;

      expect(getCompletionPercent(col)).toBe(100);
    });
  });

  describe("getPreviewCards", () => {
    it("returns owned cards with images up to the default preview size", () => {
      const card1 = { id: "c1", image: "img1.png" } as PokemonCardType;
      const card2 = { id: "c2", image: "img2.png" } as PokemonCardType;
      const card3 = { id: "c3", image: "img3.png" } as PokemonCardType;
      const card4 = { id: "c4", image: "img4.png" } as PokemonCardType;
      const cardNoImg = { id: "c5", image: "" } as PokemonCardType;

      const col = {
        items: [
          { id: 1, quantity: 1, pokemonCard: card1 },
          { id: 2, quantity: 0, pokemonCard: card2 }, // unowned
          { id: 3, quantity: 1, pokemonCard: cardNoImg }, // no image
          { id: 4, quantity: 2, pokemonCard: card3 },
          { id: 5, quantity: 1, pokemonCard: card4 },
        ] as CollectionItemType[],
      } as Collection;

      const preview = getPreviewCards(col);
      expect(preview).toHaveLength(3);
      expect(preview).toEqual([card1, card3, card4]);
    });

    it("respects a custom preview size parameter", () => {
      const card1 = { id: "c1", image: "img1.png" } as PokemonCardType;
      const card2 = { id: "c2", image: "img2.png" } as PokemonCardType;

      const col = {
        items: [
          { id: 1, quantity: 1, pokemonCard: card1 },
          { id: 2, quantity: 1, pokemonCard: card2 },
        ] as CollectionItemType[],
      } as Collection;

      expect(getPreviewCards(col, 1)).toEqual([card1]);
      expect(COLLECTION_PREVIEW_SIZE).toBe(3);
    });

    it("returns empty array when collection items is empty or undefined", () => {
      expect(getPreviewCards({} as unknown as Collection)).toEqual([]);
    });
  });
});
