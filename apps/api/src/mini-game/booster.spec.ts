import {
  drawPack,
  emptyPools,
  PACK_COMPOSITIONS,
  packSize,
  pickTier,
  RarityTier,
  rarityTier,
  resolveTier,
  type TierPools,
} from "./booster";

describe("booster rules", () => {
  describe("rarityTier", () => {
    it("maps French and English labels to the same tier", () => {
      expect(rarityTier("Commune")).toBe(RarityTier.Common);
      expect(rarityTier("Common")).toBe(RarityTier.Common);
      expect(rarityTier("Peu Commune")).toBe(RarityTier.Uncommon);
      expect(rarityTier("Double rare")).toBe(RarityTier.Holo);
      expect(rarityTier("Illustration rare")).toBe(RarityTier.Ultra);
      expect(rarityTier("Illustration spéciale rare")).toBe(RarityTier.Secret);
      expect(rarityTier("Special illustration rare")).toBe(RarityTier.Secret);
      expect(rarityTier("Magnifique rare")).toBe(RarityTier.Secret);
      expect(rarityTier("Magnifique")).toBe(RarityTier.Holo);
    });

    it("ignores case and surrounding spaces, rejects unknown labels", () => {
      expect(rarityTier("  hyper RARE ")).toBe(RarityTier.Secret);
      expect(rarityTier("Mythic")).toBeNull();
      expect(rarityTier(null)).toBeNull();
    });
  });

  describe("pack styles", () => {
    it("have the documented sizes", () => {
      expect(packSize("standard")).toBe(6);
      expect(packSize("premium")).toBe(6);
      expect(packSize("chase")).toBe(3);
    });

    it("keep premium and chase free of commons and uncommons", () => {
      for (const style of ["premium", "chase"] as const) {
        for (const slot of PACK_COMPOSITIONS[style]) {
          expect(slot[RarityTier.Common] ?? 0).toBe(0);
          expect(slot[RarityTier.Uncommon] ?? 0).toBe(0);
        }
      }
    });
  });

  describe("pickTier", () => {
    it("follows the weights", () => {
      const slot = { [RarityTier.Rare]: 70, [RarityTier.Holo]: 30 };
      expect(pickTier(slot, () => 0)).toBe(RarityTier.Rare);
      expect(pickTier(slot, () => 0.69)).toBe(RarityTier.Rare);
      expect(pickTier(slot, () => 0.71)).toBe(RarityTier.Holo);
      expect(pickTier(slot, () => 0.999)).toBe(RarityTier.Holo);
    });
  });

  describe("resolveTier", () => {
    it("falls back to the nearest lower tier first, then higher", () => {
      const pools: TierPools<string> = emptyPools();
      pools[RarityTier.Holo] = ["h"];
      pools[RarityTier.Ultra] = ["u"];

      expect(resolveTier(RarityTier.Secret, pools)).toBe(RarityTier.Ultra);
      expect(resolveTier(RarityTier.Common, pools)).toBe(RarityTier.Holo);
      expect(resolveTier(RarityTier.Ultra, pools)).toBe(RarityTier.Ultra);
      expect(resolveTier(RarityTier.Rare, emptyPools())).toBeNull();
    });
  });

  describe("drawPack", () => {
    const pools = (): TierPools<string> => ({
      [RarityTier.Common]: ["c1", "c2", "c3"],
      [RarityTier.Uncommon]: ["u1", "u2"],
      [RarityTier.Rare]: ["r1"],
      [RarityTier.Holo]: ["h1", "h2"],
      [RarityTier.Ultra]: ["x1"],
      [RarityTier.Secret]: ["s1"],
    });

    it("draws a full pack without duplicates when the pools allow it", () => {
      for (let i = 0; i < 50; i += 1) {
        const pack = drawPack(pools(), "standard", (c) => c);
        expect(pack).toHaveLength(6);
        expect(new Set(pack).size).toBe(6);
      }
    });

    it("never draws a common in a chase pack", () => {
      for (let i = 0; i < 50; i += 1) {
        const pack = drawPack(pools(), "chase", (c) => c);
        expect(pack).toHaveLength(3);
        expect(pack.every((c) => /^[hxs]/.test(c))).toBe(true);
      }
    });

    it("degrades to the tiers that exist in a small set, repeating only when exhausted", () => {
      const small: TierPools<string> = emptyPools();
      small[RarityTier.Common] = ["c1"];
      small[RarityTier.Rare] = ["r1", "r2"];

      const pack = drawPack(
        small,
        "premium",
        (c) => c,
        () => 0,
      );
      expect(pack).toHaveLength(6);
      // Three distinct cards exist: they are all used before any repeat.
      expect(new Set(pack.slice(0, 3))).toEqual(new Set(["r1", "r2", "c1"]));
      expect(pack.slice(3).every((c) => c.startsWith("r"))).toBe(true);
    });

    it("returns an empty pack when there is nothing to draw", () => {
      expect(drawPack(emptyPools<string>(), "standard", (c) => c)).toEqual([]);
    });
  });
});
