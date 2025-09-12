import { Pricing } from "@/app/tournaments/interfaces";

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

  // Type (ex: standard, premium...) si pertinent
  if (pricing.type) parts.push(pricing.type.replace(/_/g, " "));

  return parts.length ? parts.join(" • ") : "Non défini";
}
