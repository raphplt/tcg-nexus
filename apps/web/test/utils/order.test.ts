import { describe, expect, it } from "vitest";
import {
  getFulfillmentColor,
  getFulfillmentKey,
  getOrderItemImage,
  getOrderItemUrl,
  getOrderStatusColor,
  getOrderStatusKey,
} from "@/utils/order";
import { FulfillmentStatus, OrderStatus } from "@/types/order";
import { SEALED_PLACEHOLDER } from "@/utils/sealedImage";

describe("order utilities", () => {
  describe("status keys & colors", () => {
    it("returns correct order status keys and tailwind badge colors", () => {
      expect(getOrderStatusKey(OrderStatus.PAID)).toBe("orderStatus.Paid");
      expect(getOrderStatusColor(OrderStatus.PAID)).toContain("bg-green-500");
      expect(getOrderStatusColor(OrderStatus.CANCELLED)).toContain(
        "bg-red-500",
      );
      expect(getOrderStatusColor("UNKNOWN" as any)).toBe("bg-gray-500");
    });

    it("returns correct fulfillment status keys and badge colors", () => {
      expect(getFulfillmentKey(FulfillmentStatus.TO_SHIP)).toBe(
        "fulfillment.to_ship",
      );
      expect(getFulfillmentColor(FulfillmentStatus.SHIPPED)).toContain(
        "bg-indigo-500",
      );
      expect(getFulfillmentColor(FulfillmentStatus.DELIVERED)).toContain(
        "bg-emerald-600",
      );
    });
  });

  describe("getOrderItemImage & getOrderItemUrl", () => {
    it("returns image and url for sealed products", () => {
      const sealedItem: any = {
        productKind: "sealed",
        listing: {
          sealedProduct: {
            id: "sp-123",
            image: "https://cdn.example.com/box.png",
          },
        },
      };

      expect(getOrderItemImage(sealedItem)).toBe(
        "https://cdn.example.com/box.png",
      );
      expect(getOrderItemUrl(sealedItem)).toBe("/marketplace/sealed/sp-123");
    });

    it("falls back to placeholder for sealed products without image", () => {
      const emptySealedItem: any = {
        productKind: "sealed",
        listing: {
          sealedProduct: {
            id: "sp-empty",
          },
        },
      };

      expect(getOrderItemImage(emptySealedItem)).toBe(SEALED_PLACEHOLDER);
    });

    it("returns image and url for pokemon cards", () => {
      const cardItem: any = {
        productKind: "card",
        listing: {
          pokemonCard: {
            id: "card-456",
            image: "https://assets.tcgdex.net/fr/swsh/swsh4/185",
          },
        },
      };

      expect(getOrderItemImage(cardItem)).toBe(
        "https://assets.tcgdex.net/fr/swsh/swsh4/185/high.png",
      );
      expect(getOrderItemUrl(cardItem)).toBe("/marketplace/cards/card-456");
    });

    it("returns null url if listing is missing", () => {
      expect(getOrderItemUrl({} as any)).toBeNull();
    });
  });
});
