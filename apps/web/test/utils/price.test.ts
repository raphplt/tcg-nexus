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
    it("does not include early bird if early bird is greater than or equal to base price", () => {
      const pricing: any = {
        basePrice: "20",
        earlyBirdPrice: "25",
        type: "STANDARD",
      };
      const result = formatPricing(pricing);
      expect(result).toContain("20");
      expect(result).not.toContain("early:");
    });

    it("handles non-numeric base price and empty pricing", () => {
      expect(formatPricing({ basePrice: "invalid" } as any)).toBe("Non défini");
      expect(formatPricing({} as any)).toBe("Non défini");
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
          normal: {
            marketPrice: null as any,
            midPrice: null as any,
            lowPrice: 8,
          },
        } as any),
      ).toBe(8);
    });

    it("checks other variants if normal is missing", () => {
      expect(
        getTcgPlayerPrice({
          holofoil: { marketPrice: 25 },
        } as any),
      ).toBe(25);

      expect(
        getTcgPlayerPrice({
          reverseHolofoil: { midPrice: 15 },
        } as any),
      ).toBe(15);

      expect(
        getTcgPlayerPrice({
          "1stEditionHolofoil": { lowPrice: 40 },
        } as any),
      ).toBe(40);

      expect(
        getTcgPlayerPrice({
          "1stEditionNormal": { marketPrice: 5 },
        } as any),
      ).toBe(5);
    });

    it("returns null if all variants are empty or lack prices", () => {
      expect(
        getTcgPlayerPrice({
          normal: {
            marketPrice: null as any,
            midPrice: null as any,
            lowPrice: null as any,
          },
        } as any),
      ).toBeNull();
      expect(getTcgPlayerPrice({} as any)).toBeNull();
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

    it("falls back through avg1, avg7, avg30, avg, low when trend is null", () => {
      expect(getCardMarketPrice({ avg1: 11 } as any)).toBe(11);
      expect(getCardMarketPrice({ avg7: 12 } as any)).toBe(12);
      expect(getCardMarketPrice({ avg30: 13 } as any)).toBe(13);
      expect(getCardMarketPrice({ avg: 14 } as any)).toBe(14);
      expect(getCardMarketPrice({ low: 5 } as any)).toBe(5);
      expect(getCardMarketPrice({} as any)).toBeNull();
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

      // Falls back to regular fields if holo fields are missing
      expect(
        getCardMarketPrice(
          {
            trend: 10.0,
          } as any,
          true,
        ),
      ).toBe(10.0);
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

    it("falls back to TCGPlayer for EUR/GBP/CHF if CardMarket is missing", () => {
      const gbpRef = getMarketReferencePrice(
        {
          tcgplayer: { normal: { marketPrice: 22 } },
        } as any,
        "GBP",
      );
      expect(gbpRef).toEqual({ price: 22, currency: "USD" });

      const chfRef = getMarketReferencePrice(
        {
          tcgplayer: { normal: { marketPrice: 25 } },
        } as any,
        "CHF",
      );
      expect(chfRef).toEqual({ price: 25, currency: "USD" });

      const defaultRef = getMarketReferencePrice({
        tcgplayer: { normal: { marketPrice: 30 } },
      } as any);
      expect(defaultRef).toEqual({ price: 30, currency: "USD" });
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

    it("falls back to CardMarket for non-EUR currencies when TCGPlayer is missing", () => {
      const ref = getMarketReferencePrice(
        {
          cardmarket: { trend: 14.5 },
        } as any,
        "USD",
      );

      expect(ref).toEqual({ price: 14.5, currency: "EUR" });
    });

    it("returns null if neither source has price", () => {
      expect(getMarketReferencePrice({} as any, "EUR")).toBeNull();
      expect(getMarketReferencePrice({} as any, "USD")).toBeNull();
    });
  });
});
