import React from "react";
import { H2 } from "../Shared/Titles";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import Image from "next/image";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useMarketplaceHome } from "@/hooks/useMarketplace";
import { Currency } from "@/utils/enums";
import { getCardImage } from "@/utils/images";
import { formatCurrency } from "@/utils/format";
import { useLocale, useTranslations } from "next-intl";

const MarketplacePreview = () => {
  const locale = useLocale();
  const t = useTranslations("Home");
  const { popularCards, loadingPopular: isLoading } = useMarketplaceHome();
  return (
    <Card className="p-6">
      <H2 className="mb-4">{t("marketplace.title")}</H2>
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          {t("common.loading")}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {popularCards?.slice(0, 4).map((popularCard) => (
          <div
            key={popularCard.card.id}
            className="flex items-center gap-4 p-3 rounded-lg border hover:shadow-md transition bg-background"
          >
            <Link
              href={`/marketplace/cards/${popularCard.card.id}`}
              className="flex items-center gap-4 flex-1 min-w-0"
            >
              <div className="flex-shrink-0">
                <Image
                  src={getCardImage(popularCard.card, "low")}
                  alt={popularCard.card.name || t("common.pokemonCard")}
                  width={56}
                  height={80}
                  className="object-cover rounded border"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {popularCard.card.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {popularCard.card.set?.name || t("marketplace.unknownSet")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {popularCard.card.rarity || t("marketplace.unknownRarity")}
                </div>
                <div className="text-sm font-medium text-primary mt-1">
                  {formatCurrency(popularCard.avgPrice, Currency.EUR, locale)}
                </div>
              </div>
            </Link>

            <Button variant="secondary" asChild>
              <Link
                href={`/marketplace/cards/${popularCard.card.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ShoppingCart className="mr-2 w-4 h-4" />
                {t("marketplace.buy")}
              </Link>
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" asChild size="sm" className="w-full mt-4">
        <Link href="/marketplace" className="flex items-center gap-2">
          {t("marketplace.viewAll")}
          <ArrowRight className="mr-2 w-4 h-4" />
        </Link>
      </Button>
    </Card>
  );
};

export default MarketplacePreview;
