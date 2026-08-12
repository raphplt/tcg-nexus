import { CardPricingData } from "src/card/entities/card.entity";
import { Currency } from "../common/enums/currency";

export const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Retrieves external reference market price of a card in the specified currency.
 *
 * @param pricing Card pricing metadata structure.
 * @param currency Target currency code.
 * @returns Market reference price or null.
 */
export function getMarketReferencePrice(
  pricing: CardPricingData | null | undefined,
  currency: string,
): number | null {
  if (!pricing) return null;

  if (currency === Currency.EUR) {
    const cm = pricing.cardmarket;
    const price = cm?.trend ?? cm?.avg7 ?? cm?.avg30 ?? cm?.avg ?? null;
    return price !== null ? round2(price) : null;
  }

  if (currency === Currency.USD) {
    const variants = [
      pricing.tcgplayer?.normal,
      pricing.tcgplayer?.holofoil,
      pricing.tcgplayer?.reverseHolofoil,
    ];
    for (const variant of variants) {
      const price = variant?.marketPrice ?? variant?.midPrice ?? null;
      if (price !== null) return round2(price);
    }
  }

  return null;
}
