"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
import { PriceChart } from "@/components/Marketplace/PriceChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  useSealedProduct,
  useSealedProductListings,
  useSealedProductStatistics,
} from "@/hooks/useSealedProducts";
import { sealedEventTracker } from "@/services/sealed-event-tracker.service";
import { useCartStore } from "@/store/cart.store";
import { Listing } from "@/types/listing";
import { sealedProductTypeLabels } from "@/types/sealed-product";
import { getSealedImageUrl } from "@/utils/sealedImage";
import { SealedListingsTable } from "./_components/SealedListingsTable";
import { SealedMarketStats } from "./_components/SealedMarketStats";
import SellSealedForm from "./_components/SellSealedForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SealedProductDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { addItem, isLoading: isCartLoading } = useCartStore();

  const [quantitiesByListing, setQuantitiesByListing] = useState<
    Record<number, number>
  >({});
  const [addingToListingId, setAddingToListingId] = useState<number | null>(
    null,
  );

  const { data: product, isLoading: loadingProduct } = useSealedProduct(id);
  const { data: listingsData, isLoading: loadingListings } =
    useSealedProductListings(id);
  const { data: stats, isLoading: loadingStats } =
    useSealedProductStatistics(id);

  const listings = listingsData?.data || [];
  const imageUrl = product ? getSealedImageUrl(product) : null;

  useEffect(() => {
    if (id) {
      sealedEventTracker.trackView(id);
    }
  }, [id]);

  const handleAddToCart = async (listing: Listing) => {
    if (!isAuthenticated) {
      toast.error("Vous devez être connecté pour ajouter au panier");
      router.push("/auth/login");
      return;
    }

    const quantity = Math.max(
      1,
      Math.min(
        quantitiesByListing[listing.id] ?? 1,
        listing.quantityAvailable,
      ),
    );

    setAddingToListingId(listing.id);
    try {
      sealedEventTracker.trackAddToCart(id, listing.id);
      await addItem({ listingId: listing.id, quantity });
      toast.success("Article ajouté au panier !");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Erreur lors de l'ajout au panier";
      toast.error(message);
    } finally {
      setAddingToListingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-secondary/10 to-primary/10 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <MarketplaceBreadcrumb />

        {loadingProduct ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        ) : !product ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Produit introuvable.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted/40">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={product.nameEn}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Pas d'image disponible
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">{product.nameEn}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {sealedProductTypeLabels[product.productType]}
                      </Badge>
                      {product.pokemonSet && (
                        <Badge variant="secondary">
                          {product.pokemonSet.name}
                        </Badge>
                      )}
                    </div>
                    {product.contents?.boosterCount !== undefined && (
                      <p className="text-sm text-muted-foreground">
                        Contenu : {product.contents.boosterCount} booster
                        {product.contents.boosterCount > 1 ? "s" : ""}
                      </p>
                    )}
                    {product.sku && (
                      <p className="text-xs text-muted-foreground">
                        SKU : {product.sku}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <SealedMarketStats stats={stats} loading={loadingStats} />
              </div>
            </div>

            {stats && stats.priceHistory.length > 0 && (
              <PriceChart
                data={stats.priceHistory}
                currency={stats.priceHistory[0]?.currency || "EUR"}
                showTrend={true}
              />
            )}

            <SealedListingsTable
              listings={listings}
              loading={loadingListings}
              quantitiesByListing={quantitiesByListing}
              onChangeQuantity={(listingId, quantity) =>
                setQuantitiesByListing((prev) => ({
                  ...prev,
                  [listingId]: quantity,
                }))
              }
              onAddToCart={handleAddToCart}
              addingToListingId={addingToListingId}
              isCartLoading={isCartLoading}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vendre ce produit</CardTitle>
              </CardHeader>
              <CardContent>
                <SellSealedForm sealedProductId={product.id} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
