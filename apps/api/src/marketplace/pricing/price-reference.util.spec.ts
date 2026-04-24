import { CardMarketPricing, CardPricingData } from "src/card/entities/card.entity";
import {
  getCardMarketPrice,
  getMarketReferencePrice,
  getTcgPlayerPrice,
} from "./price-reference.util";

describe("price-reference.util", () => {
  describe("getCardMarketPrice", () => {
    it("retourne null si pricing absent", () => {
      expect(getCardMarketPrice(null)).toBeNull();
      expect(getCardMarketPrice(undefined)).toBeNull();
    });

    it("priorise trend sur les autres champs", () => {
      const cm: Partial<CardMarketPricing> = { trend: 10, avg1: 5, low: 2 };
      expect(getCardMarketPrice(cm as CardMarketPricing)).toBe(10);
    });

    it("retombe sur avg1 puis avg7 quand trend absent", () => {
      const cm: Partial<CardMarketPricing> = {
        trend: null,
        avg1: null,
        avg7: 7,
      };
      expect(getCardMarketPrice(cm as CardMarketPricing)).toBe(7);
    });

    it("utilise les champs holo quand preferHolo est true", () => {
      const cm: Partial<CardMarketPricing> = {
        trend: 10,
        "trend-holo": 50,
      };
      expect(getCardMarketPrice(cm as CardMarketPricing, true)).toBe(50);
    });

    it("retombe sur les champs standards si aucun champ holo dispo", () => {
      const cm: Partial<CardMarketPricing> = { trend: 10 };
      expect(getCardMarketPrice(cm as CardMarketPricing, true)).toBe(10);
    });
  });

  describe("getTcgPlayerPrice", () => {
    it("parcourt les variantes jusqu'à trouver marketPrice", () => {
      const tcg = {
        normal: { marketPrice: null, midPrice: null, lowPrice: null },
        holofoil: { marketPrice: 15 },
      } as any;
      expect(getTcgPlayerPrice(tcg)).toBe(15);
    });

    it("priorise marketPrice > midPrice > lowPrice", () => {
      expect(
        getTcgPlayerPrice({
          normal: { marketPrice: null, midPrice: 3, lowPrice: 1 },
        } as any),
      ).toBe(3);
    });
  });

  describe("getMarketReferencePrice", () => {
    it("favorise CardMarket en EUR", () => {
      const pricing: CardPricingData = {
        cardmarket: { trend: 12 } as CardMarketPricing,
        tcgplayer: { normal: { marketPrice: 9 } } as any,
      };
      expect(getMarketReferencePrice(pricing)).toEqual({
        price: 12,
        currency: "EUR",
      });
    });

    it("retombe sur TCGPlayer en USD si CardMarket indisponible", () => {
      const pricing: CardPricingData = {
        cardmarket: null,
        tcgplayer: { normal: { marketPrice: 9 } } as any,
      };
      expect(getMarketReferencePrice(pricing)).toEqual({
        price: 9,
        currency: "USD",
      });
    });

    it("retourne null quand aucune source n'est disponible", () => {
      expect(getMarketReferencePrice(null)).toBeNull();
      expect(getMarketReferencePrice({ cardmarket: null, tcgplayer: null })).toBeNull();
    });
  });
});
