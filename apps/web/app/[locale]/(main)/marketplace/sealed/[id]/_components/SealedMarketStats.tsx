"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("SealedStats");
  const { formatPrice } = useCurrencyStore();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
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
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats.totalListings > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("minPrice")}</span>
              <span className="text-2xl font-bold text-primary">
                {stats.minPrice !== null
                  ? formatPrice(stats.minPrice, currency)
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("avgPrice")}</span>
              <span className="text-lg font-semibold">
                {stats.avgPrice !== null
                  ? formatPrice(stats.avgPrice, currency)
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("maxPrice")}</span>
              <span className="text-lg">
                {stats.maxPrice !== null
                  ? formatPrice(stats.maxPrice, currency)
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-muted-foreground">
                {t("activeListings")}
              </span>
              <Badge variant="secondary">{stats.totalListings}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("totalStock")}</span>
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
