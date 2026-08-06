import { Listing } from "@/types/listing";

type ShippableItem = {
  listing: Pick<Listing, "id" | "shippingCost" | "seller">;
};

export function estimateShipping(items: ShippableItem[]): number {
  const costBySeller = new Map<string, number>();

  for (const { listing } of items) {
    const key = listing.seller?.id
      ? `seller:${listing.seller.id}`
      : `listing:${listing.id}`;
    const cost = Number(listing.shippingCost ?? 0);
    costBySeller.set(key, Math.max(costBySeller.get(key) ?? 0, cost));
  }

  const total = [...costBySeller.values()].reduce((sum, cost) => sum + cost, 0);
  return Math.round(total * 100) / 100;
}

export function formatHandlingTime(days: number | null | undefined): string {
  if (!days || days <= 0) return "Expédition sous 24 h";
  return `Expédition sous ${days} jour${days > 1 ? "s" : ""} ouvré${days > 1 ? "s" : ""}`;
}
