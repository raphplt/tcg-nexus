"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SealedProductStatistics } from "@/services/sealed-product.service";
import { useCurrencyStore } from "@/store/currency.store";

interface SealedMarketStatsProps {
  stats?: SealedProductStatistics;
  loading: boolean;
}

export function SealedMarketStats({ stats, loading }: SealedMarketStatsProps) {
  const { formatPrice } = useCurrencyStore();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prix du marché</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const currency = stats.priceHistory[0]?.currency || "EUR";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prix du marché</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats.totalListings > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Prix minimum</span>
              <span className="text-2xl font-bold text-primary">
                {stats.minPrice !== null
                  ? formatPrice(stats.minPrice, currency)
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Prix moyen</span>
              <span className="text-lg font-semibold">
                {stats.avgPrice !== null
                  ? formatPrice(stats.avgPrice, currency)
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Prix maximum</span>
              <span className="text-lg">
                {stats.maxPrice !== null
                  ? formatPrice(stats.maxPrice, currency)
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-muted-foreground">Annonces actives</span>
              <Badge variant="secondary">{stats.totalListings}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stock total</span>
              <Badge variant="secondary">{stats.totalStock}</Badge>
            </div>
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
