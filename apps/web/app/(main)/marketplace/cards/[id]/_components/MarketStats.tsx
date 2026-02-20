import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrencyStore } from "@/store/currency.store";
import type { CardPricing } from "@/types/cardPokemon";
import { getCardMarketPrice, getTcgPlayerPrice } from "@/utils/price";
import { Star } from "lucide-react";

interface MarketStatsProps {
  stats: {
    totalListings: number;
    minPrice: number | null;
    avgPrice: number | null;
    maxPrice: number | null;
    currency: string | null;
  };
  isGoodDeal: boolean;
  marketPricing?: CardPricing | null;
}

function MarketReferencePrices({
  marketPricing,
}: { marketPricing: CardPricing }) {
  const { formatPrice } = useCurrencyStore();

  const cmPrice = getCardMarketPrice(marketPricing.cardmarket);
  const tcgPrice = getTcgPlayerPrice(marketPricing.tcgplayer);

  if (cmPrice == null && tcgPrice == null) return null;

  return (
    <div className="border-t pt-4 space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">
        Prix de référence
      </h4>
      {cmPrice != null && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            CardMarket (tendance)
          </span>
          <span className="font-semibold">
            {formatPrice(cmPrice, "EUR")}
          </span>
        </div>
      )}
      {tcgPrice != null && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            TCGPlayer (marché)
          </span>
          <span className="font-semibold">
            {formatPrice(tcgPrice, "USD")}
          </span>
        </div>
      )}
    </div>
  );
}

export function MarketStats({
  stats,
  isGoodDeal,
  marketPricing,
}: MarketStatsProps) {
  const { formatPrice } = useCurrencyStore();

  if (!stats) return null;

  const hasMarketPricing =
    marketPricing &&
    (getCardMarketPrice(marketPricing.cardmarket) != null ||
      getTcgPlayerPrice(marketPricing.tcgplayer) != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prix du marché</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.totalListings > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Prix minimum</span>
              <span className="text-2xl font-bold text-primary">
                {stats.minPrice !== null
                  ? formatPrice(stats.minPrice, stats.currency || "EUR")
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Prix moyen</span>
              <span className="text-lg font-semibold">
                {stats.avgPrice !== null
                  ? formatPrice(stats.avgPrice, stats.currency || "EUR")
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Prix maximum</span>
              <span className="text-lg">
                {stats.maxPrice !== null
                  ? formatPrice(stats.maxPrice, stats.currency || "EUR")
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-muted-foreground">Offres disponibles</span>
              <Badge variant="secondary">{stats.totalListings}</Badge>
            </div>
            {isGoodDeal && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-600 font-semibold">
                  <Star className="w-4 h-4" />
                  Bon deal disponible !
                </div>
              </div>
            )}
            {hasMarketPricing && (
              <MarketReferencePrices marketPricing={marketPricing!} />
            )}
          </>
        ) : hasMarketPricing ? (
          <>
            <MarketReferencePrices marketPricing={marketPricing!} />
            <p className="text-muted-foreground text-center text-sm pt-2">
              Aucune offre en vente pour le moment
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            Aucune offre disponible pour le moment
          </p>
        )}
      </CardContent>
    </Card>
  );
}
