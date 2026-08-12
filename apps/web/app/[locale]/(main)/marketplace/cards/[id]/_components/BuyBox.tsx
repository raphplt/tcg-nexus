"use client";

import { useTranslations } from "next-intl";
import { Loader2, ShieldCheck, ShoppingCart, Tag, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrencyStore } from "@/store/currency.store";
import type { CardPricing } from "@/types/cardPokemon";
import type { Listing } from "@/types/listing";
import { cardStates } from "@/utils/variables";
import { getCardStateColor } from "../../../utils";
import { hasReferencePrices, ReferencePrices } from "./ReferencePrices";

interface BuyBoxProps {
  totalListings: number;
  minPrice: number | null;
  avgPrice: number | null;
  maxPrice: number | null;
  currency: string | null;
  bestListing: Listing | null;
  isGoodDeal: boolean;
  loading: boolean;
  marketPricing?: CardPricing | null;
  cardName?: string;
  onAddToCart: (listingId: number) => void;
  isAdding: boolean;
  isCartLoading: boolean;
}

const stateLabel = (value?: string | null) =>
  cardStates.find((s) => s.value === value)?.label ?? value ?? "";

export function BuyBox({
  totalListings,
  minPrice,
  avgPrice,
  maxPrice,
  currency,
  bestListing,
  isGoodDeal,
  loading,
  marketPricing,
  cardName,
  onAddToCart,
  isAdding,
  isCartLoading,
}: BuyBoxProps) {
  const t = useTranslations("BuyBox");
  const { formatPrice } = useCurrencyStore();
  const displayCurrency = currency || bestListing?.currency || "EUR";
  const showReferences = hasReferencePrices(marketPricing);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="p-6 space-y-5">
        {totalListings > 0 && bestListing ? (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t("startingAt")}
                </span>
                {isGoodDeal && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1">
                    <Tag className="w-3 h-3" />
                    Bon plan
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight tabular-nums">
                  {minPrice !== null
                    ? formatPrice(minPrice, displayCurrency)
                    : formatPrice(bestListing.price, bestListing.currency)}
                </span>
                <Badge
                  variant="outline"
                  className={getCardStateColor(bestListing.cardState)}
                >
                  {stateLabel(bestListing.cardState)}
                </Badge>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Truck className="w-3.5 h-3.5" />
                {bestListing.shippingCost > 0
                  ? `+ ${formatPrice(bestListing.shippingCost, bestListing.currency)} de frais de port`
                  : t("freeShipping")}
                {bestListing.handlingTimeDays
                  ? ` · expédié sous ${bestListing.handlingTimeDays} j`
                  : ""}
              </p>
            </div>

            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full"
                onClick={() => onAddToCart(bestListing.id)}
                disabled={
                  isAdding ||
                  isCartLoading ||
                  bestListing.quantityAvailable === 0
                }
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
                {t("addToCart")}
              </Button>
              <Button variant="outline" size="lg" className="w-full" asChild>
                <a href="#offres">
                  Comparer les {totalListings} offre
                  {totalListings > 1 ? "s" : ""}
                </a>
              </Button>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {t("secureNotice")}
            </p>

            <Separator />

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">{t("averagePrice")}</dt>
                <dd className="font-semibold tabular-nums">
                  {avgPrice !== null
                    ? formatPrice(avgPrice, displayCurrency)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("highestPrice")}</dt>
                <dd className="font-semibold tabular-nums">
                  {maxPrice !== null
                    ? formatPrice(maxPrice, displayCurrency)
                    : "—"}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="font-semibold">{t("noListingsTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("noListings")}</p>
            </div>
            <Button className="w-full" asChild>
              <Link href="/marketplace/create">{t("sellThisCard")}</Link>
            </Button>
          </div>
        )}

        {showReferences && (
          <>
            <Separator />
            <ReferencePrices
              marketPricing={marketPricing}
              cardName={cardName}
            />
          </>
        )}
      </div>

      {totalListings > 0 && (
        <div className="border-t bg-muted/30 px-6 py-3 text-sm">
          <span className="text-muted-foreground">
            Vous possédez cette carte ?{" "}
          </span>
          <Link
            href="/marketplace/create"
            className="font-medium text-primary hover:underline"
          >
            {t("sellIt")}
          </Link>
        </div>
      )}
    </div>
  );
}
