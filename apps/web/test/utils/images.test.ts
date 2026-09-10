import { describe, expect, it } from "vitest";
import {
  getCardImage,
  getRarityImage,
  getSeriesLogo,
  getSetImage,
  getSetLogo,
  getSetSymbol,
  getTypeImage,
  normalizeAssetUrl,
  rewriteLegacyHost,
} from "@/utils/images";
import { Rarity } from "@/types/listing";

describe("images utils", () => {
  describe("getTypeImage", () => {
    it("returns correct image for known types", () => {
      expect(getTypeImage("plante")).toBe("/images/types/Type-Plante-JCC.png");
      expect(getTypeImage("feu")).toBe("/images/types/Type-Feu-JCC.png");
      expect(getTypeImage("eau")).toBe("/images/types/Type-Eau-JCC.png");
    });

    it("returns undefined for unknown type", () => {
      expect(getTypeImage("inconnu")).toBeUndefined();
    });
  });

  describe("getRarityImage", () => {
    it("returns image for direct enum match", () => {
      expect(getRarityImage(Rarity.COMMUNE)).toBe(
        "/images/rareties/JCC-commune.png",
      );
      expect(getRarityImage(Rarity.ULTRA_RARE)).toBe(
        "/images/rareties/JCC-ultra-rare.png",
      );
    });

    it("returns image for normalized aliases", () => {
      expect(getRarityImage("Common")).toBe("/images/rareties/JCC-commune.png");
      expect(getRarityImage("Special Illustration Rare")).toBe(
        "/images/rareties/JCC-Illustration-Spéciale-Rare.png",
      );
      expect(getRarityImage("black white rare")).toBe(
        "/images/rareties/JCC-Noir-Blanc-Rare.png",
      );
    });

    it("returns undefined for unrecognized rarity", () => {
      expect(getRarityImage("Mystic Ultra")).toBeUndefined();
    });
  });

  describe("rewriteLegacyHost", () => {
    it("returns undefined for empty/null/undefined input", () => {
      expect(rewriteLegacyHost(null)).toBeUndefined();
      expect(rewriteLegacyHost(undefined)).toBeUndefined();
      expect(rewriteLegacyHost("")).toBeUndefined();
      expect(rewriteLegacyHost("   ")).toBeUndefined();
    });

    it("rewrites legacy R2 domain to cdn.tcg-nexus.org", () => {
      const legacy =
        "https://pub-27752f7846b4433d8e74edcc8bdc1dc8.r2.dev/cards/sv1/1";
      expect(rewriteLegacyHost(legacy)).toBe(
        "https://cdn.tcg-nexus.org/cards/sv1/1",
      );
    });

    it("preserves standard URLs intact", () => {
      const url = "https://assets.tcgdex.net/fr/sv/sv01/1";
      expect(rewriteLegacyHost(url)).toBe(url);
    });
  });

  describe("normalizeAssetUrl", () => {
    it("returns undefined for empty input", () => {
      expect(normalizeAssetUrl(null)).toBeUndefined();
      expect(normalizeAssetUrl("")).toBeUndefined();
    });

    it("adds extension to bare tcgdex asset URLs", () => {
      const url = "https://assets.tcgdex.net/fr/swsh/swsh1/logo";
      expect(normalizeAssetUrl(url, "webp")).toBe(
        "https://assets.tcgdex.net/fr/swsh/swsh1/logo.webp",
      );
      expect(normalizeAssetUrl(url, "png")).toBe(
        "https://assets.tcgdex.net/fr/swsh/swsh1/logo.png",
      );
    });

    it("does not duplicate extension if already present", () => {
      const url = "https://assets.tcgdex.net/fr/swsh/swsh1/logo.png";
      expect(normalizeAssetUrl(url, "webp")).toBe(url);
    });

    it("appends version query parameter for series assets", () => {
      const url = "https://cdn.tcg-nexus.org/series/scarlet-violet.webp";
      expect(normalizeAssetUrl(url)).toBe(
        "https://cdn.tcg-nexus.org/series/scarlet-violet.webp?v=2",
      );
    });
  });

  describe("getCardImage", () => {
    it("returns placeholder when card or image is missing", () => {
      expect(getCardImage(null)).toBe("/images/carte-pokemon-dos.jpg");
      expect(getCardImage(undefined)).toBe("/images/carte-pokemon-dos.jpg");
      expect(getCardImage({ image: "" })).toBe("/images/carte-pokemon-dos.jpg");
    });

    it("builds high quality image URL by default", () => {
      const card = { image: "https://cdn.tcg-nexus.org/cards/sv1/1" };
      expect(getCardImage(card)).toBe(
        "https://cdn.tcg-nexus.org/cards/sv1/1/high.png",
      );
    });

    it("builds low quality image URL when specified", () => {
      const card = { image: "https://cdn.tcg-nexus.org/cards/sv1/1" };
      expect(getCardImage(card, "low")).toBe(
        "https://cdn.tcg-nexus.org/cards/sv1/1/low.png",
      );
    });

    it("handles URLs already ending in /high.png or /low.png without double extension", () => {
      const highCard = {
        image: "https://assets.tcgdex.net/fr/sv/sv01/1/high.png",
      };
      expect(getCardImage(highCard, "low")).toBe(
        "https://assets.tcgdex.net/fr/sv/sv01/1/low.png",
      );
      expect(getCardImage(highCard, "high")).toBe(
        "https://assets.tcgdex.net/fr/sv/sv01/1/high.png",
      );

      const lowCard = {
        image: "https://assets.tcgdex.net/fr/sv/sv01/1/low.png",
      };
      expect(getCardImage(lowCard, "high")).toBe(
        "https://assets.tcgdex.net/fr/sv/sv01/1/high.png",
      );
    });

    it("handles URLs already ending in /high or /low without extension", () => {
      const card = {
        image: "https://assets.tcgdex.net/fr/sv/sv01/1/high",
      };
      expect(getCardImage(card, "low")).toBe(
        "https://assets.tcgdex.net/fr/sv/sv01/1/low.png",
      );
    });

    it("strips trailing slashes before appending quality suffix", () => {
      const card = { image: "https://cdn.tcg-nexus.org/cards/sv1/1/" };
      expect(getCardImage(card, "high")).toBe(
        "https://cdn.tcg-nexus.org/cards/sv1/1/high.png",
      );
    });

    it("preserves standalone image files with direct extensions", () => {
      const card = { image: "https://cdn.tcg-nexus.org/uploads/card-custom.webp" };
      expect(getCardImage(card, "high")).toBe(
        "https://cdn.tcg-nexus.org/uploads/card-custom.webp",
      );
    });
  });

  describe("getSetLogo, getSetSymbol, getSetImage, getSeriesLogo", () => {
    it("resolves set logo and symbol", () => {
      const set = {
        id: "sv1",
        name: "Scarlet & Violet",
        logo: "https://assets.tcgdex.net/fr/sv/sv01/logo",
        symbol: "https://assets.tcgdex.net/fr/sv/sv01/symbol",
      } as any;

      expect(getSetLogo(set)).toBe(
        "https://assets.tcgdex.net/fr/sv/sv01/logo.webp",
      );
      expect(getSetSymbol(set)).toBe(
        "https://assets.tcgdex.net/fr/sv/sv01/symbol.png",
      );
      expect(getSetImage(set)).toBe(
        "https://assets.tcgdex.net/fr/sv/sv01/logo.webp",
      );
    });

    it("falls back to symbol when logo is missing in getSetImage", () => {
      const set = {
        id: "sv1",
        name: "Scarlet & Violet",
        symbol: "https://assets.tcgdex.net/fr/sv/sv01/symbol",
      } as any;

      expect(getSetImage(set)).toBe(
        "https://assets.tcgdex.net/fr/sv/sv01/symbol.png",
      );
    });

    it("returns undefined when neither logo nor symbol is present", () => {
      expect(getSetImage(null)).toBeUndefined();
      expect(getSetImage({} as any)).toBeUndefined();
    });

    it("resolves series logo", () => {
      const serie = {
        id: "sv",
        name: "Scarlet & Violet",
        logo: "https://cdn.tcg-nexus.org/series/sv.webp",
      } as any;

      expect(getSeriesLogo(serie)).toBe(
        "https://cdn.tcg-nexus.org/series/sv.webp?v=2",
      );
    });
  });
});
