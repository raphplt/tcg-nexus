import type {
  CardMarketPricing,
  CardPricing,
  TcgPlayerPricing,
} from "@/types/cardPokemon";
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

/**
 * Extract the best available market price from TCGPlayer data.
 * Tries normal -> holofoil -> reverseHolofoil -> 1stEditionHolofoil -> 1stEditionNormal.
 * Prefers marketPrice, falls back to midPrice, then lowPrice.
 */
export function getTcgPlayerPrice(
  tcg: TcgPlayerPricing | null | undefined,
): number | null {
  if (!tcg) return null;
  const variants = [
    tcg.normal,
    tcg.holofoil,
    tcg.reverseHolofoil,
    tcg["1stEditionHolofoil"],
    tcg["1stEditionNormal"],
  ];
  for (const v of variants) {
    if (!v) continue;
    if (v.marketPrice != null) return v.marketPrice;
    if (v.midPrice != null) return v.midPrice;
    if (v.lowPrice != null) return v.lowPrice;
  }
  return null;
}

/**
 * Extract the best available market price from CardMarket data.
 * Uses trend (most representative), falls back to avg1, avg7, avg30, avg, low.
 * If preferHolo is true, tries holo-specific fields first.
 */
export function getCardMarketPrice(
  cm: CardMarketPricing | null | undefined,
  preferHolo = false,
): number | null {
  if (!cm) return null;
  if (preferHolo) {
    const holoFields = [
      cm["trend-holo"],
      cm["avg1-holo"],
      cm["avg7-holo"],
      cm["avg30-holo"],
      cm["avg-holo"],
      cm["low-holo"],
    ];
    for (const v of holoFields) {
      if (v != null) return v;
    }
  }
  const fields = [cm.trend, cm.avg1, cm.avg7, cm.avg30, cm.avg, cm.low];
  for (const v of fields) {
    if (v != null) return v;
  }
  return null;
}

/**
 * Get the best market reference price from card pricing data.
 * Returns { price, currency } or null if no pricing available.
 * Chooses source based on preferred currency (CardMarket for EUR, TCGPlayer for USD).
 */
export function getMarketReferencePrice(
  pricing: CardPricing | null | undefined,
  preferredCurrency = "EUR",
): { price: number; currency: string } | null {
  if (!pricing) return null;

  if (
    preferredCurrency === "EUR" ||
    preferredCurrency === "GBP" ||
    preferredCurrency === "CHF"
  ) {
    const cmPrice = getCardMarketPrice(pricing.cardmarket);
    if (cmPrice != null) return { price: cmPrice, currency: "EUR" };
    const tcgPrice = getTcgPlayerPrice(pricing.tcgplayer);
    if (tcgPrice != null) return { price: tcgPrice, currency: "USD" };
  } else {
    const tcgPrice = getTcgPlayerPrice(pricing.tcgplayer);
    if (tcgPrice != null) return { price: tcgPrice, currency: "USD" };
    const cmPrice = getCardMarketPrice(pricing.cardmarket);
    if (cmPrice != null) return { price: cmPrice, currency: "EUR" };
  }

  return null;
}
