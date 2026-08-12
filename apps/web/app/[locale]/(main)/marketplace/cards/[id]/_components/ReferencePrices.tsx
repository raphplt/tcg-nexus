"use client";

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrencyStore } from "@/store/currency.store";
import type { CardPricing } from "@/types/cardPokemon";
import { getCardMarketPrice, getTcgPlayerPrice } from "@/utils/price";

interface ReferencePricesProps {
  marketPricing?: CardPricing | null;
  cardName?: string;
}

export function hasReferencePrices(pricing?: CardPricing | null) {
  if (!pricing) return false;
  return (
    getCardMarketPrice(pricing.cardmarket) != null ||
    getTcgPlayerPrice(pricing.tcgplayer) != null
  );
}

/** Indicative prices observed on external marketplaces. */
export function ReferencePrices({
  marketPricing,
  cardName,
}: ReferencePricesProps) {
  const t = useTranslations("ReferencePrices");
  const { formatPrice } = useCurrencyStore();

  const cmPrice = getCardMarketPrice(marketPricing?.cardmarket);
  const tcgPrice = getTcgPlayerPrice(marketPricing?.tcgplayer);

  if (cmPrice == null && tcgPrice == null) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{t("title")}</h3>
      <dl className="space-y-2 text-sm">
        {cmPrice != null && (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("cardmarketTrend")}</dt>
            <dd className="font-semibold tabular-nums">
              {formatPrice(cmPrice, "EUR")}
            </dd>
          </div>
        )}
        {tcgPrice != null && (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("tcgplayerMarket")}</dt>
            <dd className="font-semibold tabular-nums">
              {formatPrice(tcgPrice, "USD")}
            </dd>
          </div>
        )}
      </dl>

      {cardName && (
        <div className="flex flex-wrap gap-2">
          {cmPrice != null && (
            <Button variant="ghost" size="sm" asChild className="h-8 px-2">
              <a
                href={`https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(cardName)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Cardmarket
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          )}
          {tcgPrice != null && (
            <Button variant="ghost" size="sm" asChild className="h-8 px-2">
              <a
                href={`https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(cardName)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                TCGplayer
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
