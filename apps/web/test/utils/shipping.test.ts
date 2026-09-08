import { describe, expect, it } from "vitest";
import { estimateShipping, formatHandlingTime } from "@/utils/shipping";
import type { Listing } from "@/types/listing";

describe("shipping utils", () => {
  describe("estimateShipping", () => {
    it("returns 0 for an empty items list", () => {
      expect(estimateShipping([])).toBe(0);
    });

    it("takes the maximum shipping cost per seller", () => {
      const items = [
        {
          listing: {
            id: 1,
            shippingCost: 3.5,
            seller: { id: 10 },
          } as unknown as Listing,
        },
        {
          listing: {
            id: 2,
            shippingCost: 5.0,
            seller: { id: 10 },
          } as unknown as Listing,
        },
      ];

      expect(estimateShipping(items)).toBe(5.0);
    });

    it("sums shipping costs across distinct sellers", () => {
      const items = [
        {
          listing: {
            id: 1,
            shippingCost: 3.5,
            seller: { id: 10 },
          } as unknown as Listing,
        },
        {
          listing: {
            id: 2,
            shippingCost: 4.25,
            seller: { id: 20 },
          } as unknown as Listing,
        },
      ];

      expect(estimateShipping(items)).toBe(7.75);
    });

    it("falls back to listing ID when seller is undefined", () => {
      const items = [
        {
          listing: {
            id: 1,
            shippingCost: 2.5,
          } as unknown as Listing,
        },
        {
          listing: {
            id: 2,
            shippingCost: 3.0,
          } as unknown as Listing,
        },
      ];

      expect(estimateShipping(items)).toBe(5.5);
    });

    it("handles missing shippingCost as 0", () => {
      const items = [
        {
          listing: {
            id: 1,
            shippingCost: undefined,
            seller: { id: 10 },
          } as unknown as Listing,
        },
      ];

      expect(estimateShipping(items)).toBe(0);
    });
  });

  describe("formatHandlingTime", () => {
    it("returns 24 h default when days is null, undefined, or <= 0", () => {
      expect(formatHandlingTime(null)).toBe("Expédition sous 24 h");
      expect(formatHandlingTime(undefined)).toBe("Expédition sous 24 h");
      expect(formatHandlingTime(0)).toBe("Expédition sous 24 h");
      expect(formatHandlingTime(-2)).toBe("Expédition sous 24 h");
    });

    it("formats singular day correctly", () => {
      expect(formatHandlingTime(1)).toBe("Expédition sous 1 jour ouvré");
    });

    it("formats plural days correctly", () => {
      expect(formatHandlingTime(3)).toBe("Expédition sous 3 jours ouvrés");
    });
  });
});
