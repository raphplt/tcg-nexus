import { describe, expect, it } from "vitest";
import {
  formatPrice,
  formatPricing,
  getCardMarketPrice,
  getMarketReferencePrice,
  getTcgPlayerPrice,
} from "@/utils/price";

describe("price utilities", () => {
  describe("formatPricing", () => {
    it("returns 'Non défini' when pricing is undefined or null", () => {
      expect(formatPricing(undefined)).toBe("Non défini");
      expect(formatPricing(null)).toBe("Non défini");
    });

    it("formats a free tournament price", () => {
      const pricing: any = {
        id: 1,
        basePrice: "0",
        type: "CASUAL",
      };
      const result = formatPricing(pricing);
      expect(result).toContain("Gratuit");
      expect(result).toContain("CASUAL");
    });

    it("formats base price with early bird discount", () => {
      const pricing: any = {
        id: 2,
        basePrice: "20",
        earlyBirdPrice: "15",
        refundable: true,
        priceDescription: "Deck included",
        type: "STANDARD",
      };
      const result = formatPricing(pricing);
      expect(result).toContain("20");
      expect(result).toContain("early: ");
      expect(result).toContain("15");
      expect(result).toContain("Remboursable");
      expect(result).toContain("Deck included");
    });
  });

  describe("formatPrice", () => {
    it("returns fallback for invalid or empty prices", () => {
      expect(formatPrice(null)).toBe("—");
      expect(formatPrice(undefined)).toBe("—");
      expect(formatPrice("not-a-number")).toBe("—");
    });

    it("formats valid numeric string and number prices", () => {
      const formatted = formatPrice(12.5, "EUR");
      expect(formatted).toContain("12");

      const usdFormatted = formatPrice("99.99", "USD");
      expect(usdFormatted).toContain("99");
    });
  });

  describe("getTcgPlayerPrice", () => {
    it("returns null when tcg pricing is missing", () => {
      expect(getTcgPlayerPrice(null)).toBeNull();
      expect(getTcgPlayerPrice(undefined)).toBeNull();
    });

    it("extracts marketPrice first, then midPrice, then lowPrice", () => {
      expect(
        getTcgPlayerPrice({
          normal: { marketPrice: 10.5, midPrice: 12, lowPrice: 8 },
        } as any),
      ).toBe(10.5);

      expect(
        getTcgPlayerPrice({
          normal: { marketPrice: null as any, midPrice: 12, lowPrice: 8 },
        } as any),
      ).toBe(12);

      expect(
        getTcgPlayerPrice({
          normal: { marketPrice: null as any, midPrice: null as any, lowPrice: 8 },
        } as any),
      ).toBe(8);
    });

    it("checks other variants if normal is missing", () => {
      expect(
        getTcgPlayerPrice({
          holofoil: { marketPrice: 25 },
        } as any),
      ).toBe(25);
    });
  });

  describe("getCardMarketPrice", () => {
    it("returns null when cm pricing is missing", () => {
      expect(getCardMarketPrice(null)).toBeNull();
      expect(getCardMarketPrice(undefined)).toBeNull();
    });

    it("extracts trend price as primary metric", () => {
      expect(
        getCardMarketPrice({
          trend: 14.2,
          avg1: 15,
        } as any),
      ).toBe(14.2);
    });

    it("extracts holo prices when preferHolo is true", () => {
      expect(
        getCardMarketPrice(
          {
            "trend-holo": 35.0,
            trend: 10.0,
          } as any,
          true,
        ),
      ).toBe(35.0);
    });
  });

  describe("getMarketReferencePrice", () => {
    it("returns null when pricing is missing", () => {
      expect(getMarketReferencePrice(null)).toBeNull();
      expect(getMarketReferencePrice(undefined)).toBeNull();
    });

    it("prefers CardMarket for EUR preferred currency", () => {
      const ref = getMarketReferencePrice(
        {
          cardmarket: { trend: 18.5 },
          tcgplayer: { normal: { marketPrice: 20 } },
        } as any,
        "EUR",
      );

      expect(ref).toEqual({ price: 18.5, currency: "EUR" });
    });

    it("prefers TCGPlayer for USD preferred currency", () => {
      const ref = getMarketReferencePrice(
        {
          cardmarket: { trend: 18.5 },
          tcgplayer: { normal: { marketPrice: 20 } },
        } as any,
        "USD",
      );

      expect(ref).toEqual({ price: 20, currency: "USD" });
    });
  });
});
