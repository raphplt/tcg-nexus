import React from "react";
import { H2 } from "../Shared/Titles";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import Image from "next/image";
import { ArrowRight, ShoppingCart, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useMarketplaceHome } from "@/hooks/useMarketplace";
import { Currency } from "@/utils/enums";
import { getCardImage } from "@/utils/images";
import { formatCurrency } from "@/utils/format";
import { useLocale, useTranslations } from "next-intl";

const TrendingCardsPreview = () => {
  const locale = useLocale();
  const t = useTranslations("Home");
  const { trendingCards, loadingTrending: isLoading } = useMarketplaceHome();
  const cards = trendingCards?.slice(0, 4) ?? [];

  return (
    <Card className="p-6">
      <H2 className="mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        {t("trendingCards.title")}
      </H2>
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          {t("common.loading")}
        </div>
      )}

      {!isLoading && cards.length === 0 && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          {t("trendingCards.empty")}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {cards.map((trendingCard) => (
          <div
            key={trendingCard.card.id}
            className="flex items-center gap-4 p-3 rounded-lg border hover:shadow-md transition bg-background"
          >
            <Link
              href={`/marketplace/cards/${trendingCard.card.id}`}
              className="flex items-center gap-4 flex-1 min-w-0"
            >
              <div className="flex-shrink-0">
                <Image
                  src={getCardImage(trendingCard.card, "low")}
                  alt={trendingCard.card.name || t("common.pokemonCard")}
                  width={56}
                  height={80}
                  className="object-cover rounded border"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {trendingCard.card.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {trendingCard.card.set?.name || t("trendingCards.unknownSet")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("trendingCards.listings", {
                    count: trendingCard.listingCount ?? 0,
                  })}
                </div>
                <div className="text-sm font-medium text-primary mt-1">
                  {trendingCard.minPrice
                    ? t("trendingCards.fromPrice", {
                        price: formatCurrency(
                          trendingCard.minPrice,
                          Currency.EUR,
                          locale,
                        ),
                      })
                    : t("trendingCards.noPrice")}
                </div>
              </div>
            </Link>

            <Button variant="secondary" asChild>
              <Link
                href={`/marketplace/cards/${trendingCard.card.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ShoppingCart className="mr-2 w-4 h-4" />
                {t("trendingCards.buy")}
              </Link>
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" asChild size="sm" className="w-full mt-4">
        <Link href="/marketplace/cards" className="flex items-center gap-2">
          {t("trendingCards.viewAll")}
          <ArrowRight className="mr-2 w-4 h-4" />
        </Link>
      </Button>
    </Card>
  );
};

export default TrendingCardsPreview;
