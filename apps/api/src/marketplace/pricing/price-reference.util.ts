import {
  CardMarketPricing,
  CardPricingData,
  TcgPlayerPricing,
} from "src/card/entities/card.entity";

/**
 * Extraction du prix de référence — miroir serveur de `apps/web/utils/price.ts`.
 * Utilisé par le seed pour générer des listings réalistes, et par le module
 * external offers pour l'agrégateur de prix.
 */

/**
 * Ordre de priorité CardMarket : trend > avg1 > avg7 > avg30 > avg > low.
 * Si `preferHolo`, tente d'abord les champs holo correspondants.
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
    for (const v of holoFields) if (v != null) return v;
  }
  const fields = [cm.trend, cm.avg1, cm.avg7, cm.avg30, cm.avg, cm.low];
  for (const v of fields) if (v != null) return v;
  return null;
}

/**
 * Ordre de priorité TCGPlayer : marketPrice > midPrice > lowPrice,
 * en parcourant les variantes normal, holofoil, reverseHolofoil, etc.
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
 * Choisit un prix de référence global pour une carte en combinant CardMarket
 * (EUR) et TCGPlayer (USD). Retourne `null` si aucune source n'est disponible.
 */
export function getMarketReferencePrice(
  pricing: CardPricingData | null | undefined,
): { price: number; currency: "EUR" | "USD" } | null {
  if (!pricing) return null;
  const cm = getCardMarketPrice(pricing.cardmarket);
  if (cm != null) return { price: cm, currency: "EUR" };
  const tcg = getTcgPlayerPrice(pricing.tcgplayer);
  if (tcg != null) return { price: tcg, currency: "USD" };
  return null;
}
