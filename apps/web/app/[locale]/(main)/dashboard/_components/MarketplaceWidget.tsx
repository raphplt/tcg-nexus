import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Plus } from "lucide-react";
import type { DashboardMarketplaceData } from "@/types/dashboard";
import { useLocale, useTranslations } from "next-intl";

interface MarketplaceWidgetProps {
  data: DashboardMarketplaceData;
}

export function MarketplaceWidget({ data }: MarketplaceWidgetProps) {
  const locale = useLocale();
  const t = useTranslations("Dashboard.marketplace");
  const isEmpty =
    data.activeListings === 0 &&
    data.totalPurchases === 0 &&
    data.totalRevenue === 0;

  const formatCurrency = (value: number) =>
    value.toLocaleString(locale, { style: "currency", currency: "EUR" });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{t("title")}</CardTitle>
        <Store className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Store className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="h-3 w-3" />
              {t("explore")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-lg font-bold">{data.activeListings}</div>
                <p className="text-xs text-muted-foreground">
                  {t("activeListings", { count: data.activeListings })}
                </p>
              </div>
              <div>
                <div className="text-lg font-bold">{data.totalPurchases}</div>
                <p className="text-xs text-muted-foreground">
                  {t("purchases", { count: data.totalPurchases })}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("revenue")}</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(data.totalRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("spent")}</span>
              <span className="font-semibold">
                {formatCurrency(data.totalSpent)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
