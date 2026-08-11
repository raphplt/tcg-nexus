"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
import { PriceChart } from "@/components/Marketplace/PriceChart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useCardDetails } from "@/hooks/useCardDetails";
import { cardEventTracker } from "@/services/card-event-tracker.service";
import { useCartStore } from "@/store/cart.store";
import { BuyBox } from "./_components/BuyBox";
import { CardDetailsPanel } from "./_components/CardDetailsPanel";
import { CardGallery } from "./_components/CardGallery";
import { CardHeading } from "./_components/CardHeading";
import { ListingsTable } from "./_components/ListingsTable";

export default function CardDetailPage() {
  const t = useTranslations("CardPage");
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [cardStateFilter, setCardStateFilter] = useState<string>("all");
  const [addingToListingId, setAddingToListingId] = useState<number | null>(
    null,
  );

  const { addItem, isLoading: isCartLoading } = useCartStore();

  const {
    card,
    stats,
    listings,
    minPriceListing,
    priceHistory,
    isGoodDeal,
    loadingCard,
    loadingStats,
    loadingListings,
  } = useCardDetails({
    cardId: id as string,
    currencyFilter,
    cardStateFilter,
  });

  const hasNoOfferAtAll =
    !loadingListings &&
    listings.length === 0 &&
    currencyFilter === "all" &&
    cardStateFilter === "all";

  const handleAddToCart = async (listingId: number) => {
    if (!isAuthenticated) {
      toast.error(t("loginRequired"));
      router.push("/auth/login");
      return;
    }

    setAddingToListingId(listingId);
    try {
      if (id) {
        cardEventTracker.trackAddToCart(id as string, listingId);
      }

      await addItem({ listingId, quantity: 1 });
      toast.success(t("addedToCart"));
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || t("addError");
      toast.error(errorMessage);
    } finally {
      setAddingToListingId(null);
    }
  };

  if (loadingCard) {
    return (
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-12">
        <Skeleton className="h-[480px] lg:col-span-5" />
        <div className="space-y-4 lg:col-span-7">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <Alert variant="destructive" className="mx-auto mt-12 max-w-2xl">
        <AlertTitle>{t("notFoundTitle")}</AlertTitle>
        <AlertDescription>{t("notFoundDescription")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <MarketplaceBreadcrumb />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <CardGallery card={card} />
          </div>

          <div className="space-y-6 lg:col-span-7">
            <CardHeading card={card} />
            <BuyBox
              totalListings={stats?.totalListings ?? 0}
              minPrice={stats?.minPrice ?? null}
              maxPrice={stats?.maxPrice ?? null}
              avgPrice={stats?.avgPrice ?? null}
              currency={stats?.currency ?? null}
              bestListing={minPriceListing}
              isGoodDeal={!!isGoodDeal}
              loading={loadingStats || loadingListings}
              marketPricing={stats?.marketPricing ?? card.pricing}
              cardName={card.name}
              onAddToCart={handleAddToCart}
              isAdding={
                minPriceListing != null &&
                addingToListingId === minPriceListing.id
              }
              isCartLoading={isCartLoading}
            />
          </div>
        </div>

        {/* Sans aucune offre ni filtre actif, la BuyBox suffit à porter le message */}
        {!hasNoOfferAtAll && (
          <ListingsTable
            listings={listings}
            loading={loadingListings}
            currencyFilter={currencyFilter}
            setCurrencyFilter={setCurrencyFilter}
            cardStateFilter={cardStateFilter}
            setCardStateFilter={setCardStateFilter}
            onAddToCart={handleAddToCart}
            addingToListingId={addingToListingId}
            isCartLoading={isCartLoading}
          />
        )}

        {priceHistory.length > 1 && (
          <PriceChart
            data={priceHistory}
            currency={stats?.currency || "EUR"}
            showTrend
          />
        )}

        <CardDetailsPanel card={card} />
      </div>
    </div>
  );
}
