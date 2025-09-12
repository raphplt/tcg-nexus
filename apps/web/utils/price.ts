import { Pricing } from "@/types/tournament";

export function formatPricing(pricing?: Pricing | null): string {
  if (!pricing) return "Non défini";

  const parts: string[] = [];

  const parseNumber = (v?: string | null) => {
    if (!v) return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  };

  const formatMoney = (n?: number) => {
    if (n === undefined) return undefined;
    try {
      return n.toLocaleString(undefined, {
        style: "currency",
        currency: "EUR",
      });
    } catch {
      return n.toFixed(2) + " €";
    }
  };

  const base = parseNumber(pricing.basePrice);
  const early = parseNumber(pricing.earlyBirdPrice || undefined);

  if (base === 0) {
    parts.push("Gratuit");
  } else if (base !== undefined) {
    let priceLabel = formatMoney(base)!;
    if (early !== undefined && early < base) {
      priceLabel += ` (early: ${formatMoney(early)})`;
    }
    parts.push(priceLabel);
  }

  if (pricing.priceDescription) parts.push(pricing.priceDescription);
  if (pricing.refundable) parts.push("Remboursable");

  if (pricing.type) parts.push(pricing.type.replace(/_/g, " "));

  return parts.length ? parts.join(" • ") : "Non défini";
}

// Format price for marketplace
export const formatPrice = (
  price: string | number,
  currency: string,
): string => {
  const numericPrice = typeof price === "string" ? parseFloat(price) : price;

  try {
    return numericPrice.toLocaleString(undefined, {
      style: "currency",
      currency: currency,
    });
  } catch {
    return `${numericPrice.toFixed(2)} ${currency}`;
  }
};
