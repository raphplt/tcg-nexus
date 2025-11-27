"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PriceChart } from "@/components/Marketplace/PriceChart";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cardEventTracker } from "@/services/card-event-tracker.service";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
import { useCardDetails } from "@/hooks/useCardDetails";
import { useCartStore } from "@/store/cart.store";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { CardImage } from "./_components/CardImage";
import { CardInfo } from "./_components/CardInfo";
import { MarketStats } from "./_components/MarketStats";
import { ListingsTable } from "./_components/ListingsTable";

export default function CardDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [cardStateFilter, setCardStateFilter] = useState<string>("all");
  const [addingToListingId, setAddingToListingId] = useState<number | null>(
    null,
  );

  const { addItem, isLoading: isCartLoading } = useCartStore();
  const { formatPrice } = useCurrencyStore();

  const {
    card,
    stats,
    listings: filteredListings,
    priceHistory,
    isGoodDeal,
    loadingCard,
    loadingListings,
  } = useCardDetails({
    cardId: id as string,
    currencyFilter,
    cardStateFilter,
  });

  const handleAddToCart = async (listingId: number) => {
    if (!isAuthenticated) {
      toast.error("Vous devez être connecté pour ajouter au panier");
      router.push("/auth/login");
      return;
    }

    setAddingToListingId(listingId);
    try {
      // Track l'événement
      if (id) {
        cardEventTracker.trackAddToCart(id as string, listingId);
      }

      // Ajouter au panier
      await addItem({
        listingId,
        quantity: 1,
      });

      toast.success("Article ajouté au panier !");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "Erreur lors de l'ajout au panier";
      toast.error(errorMessage);
    } finally {
      setAddingToListingId(null);
    }
  };

  if (loadingCard) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto py-12 px-4">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!card) {
    return (
      <Alert
        variant="destructive"
        className="max-w-2xl mx-auto mt-12"
      >
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          Carte non trouvée. Veuillez réessayer plus tard.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <MarketplaceBreadcrumb />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CardImage card={card} />

          <div className="space-y-6">
            <CardInfo card={card} />
            {stats && (
              <MarketStats
                stats={stats}
                isGoodDeal={!!isGoodDeal}
              />
            )}
          </div>
        </div>

        {stats && priceHistory.length > 0 && (
          <PriceChart
            data={priceHistory}
            currency={stats.currency || "EUR"}
            showTrend={true}
          />
        )}

        <ListingsTable
          listings={filteredListings}
          loading={loadingListings}
          currencyFilter={currencyFilter}
          setCurrencyFilter={setCurrencyFilter}
          cardStateFilter={cardStateFilter}
          setCardStateFilter={setCardStateFilter}
          onAddToCart={handleAddToCart}
          addingToListingId={addingToListingId}
          isCartLoading={isCartLoading}
        />
      </div>
    </div>
  );
}
