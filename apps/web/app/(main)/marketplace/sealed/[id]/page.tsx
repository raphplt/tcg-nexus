"use client";

import Image from "next/image";
import { use } from "react";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSealedProduct,
  useSealedProductListings,
} from "@/hooks/useSealedProducts";
import { useCurrencyStore } from "@/store/currency.store";
import { sealedProductTypeLabels } from "@/types/sealed-product";
import { getSealedImageUrl } from "@/utils/sealedImage";
import SellSealedForm from "./_components/SellSealedForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SealedProductDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { formatPrice } = useCurrencyStore();
  const { data: product, isLoading: loadingProduct } = useSealedProduct(id);
  const { data: listingsData, isLoading: loadingListings } =
    useSealedProductListings(id);

  const listings = listingsData?.data || [];
  const imageUrl = product ? getSealedImageUrl(product) : null;

  return (
    <div className="min-h-screen bg-linear-to-br from-secondary/10 to-primary/10 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <MarketplaceBreadcrumb />
        </div>

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

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vendre ce produit</CardTitle>
                </CardHeader>
                <CardContent>
                  <SellSealedForm sealedProductId={product.id} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Annonces disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingListings ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune annonce active pour ce produit. Soyez le premier !
              </p>
            ) : (
              <ul className="divide-y">
                {listings.map((listing) => (
                  <li
                    key={listing.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {listing.seller.firstName} {listing.seller.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Quantité : {listing.quantityAvailable}
                      </p>
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {formatPrice(Number(listing.price), listing.currency)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
