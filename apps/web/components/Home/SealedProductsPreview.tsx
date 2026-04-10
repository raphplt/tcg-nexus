"use client";

import { ArrowRight, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useMarketplaceHome } from "@/hooks/useMarketplace";
import { sealedProductTypeLabels } from "@/types/sealed-product";
import { getSealedImageUrl } from "@/utils/sealedImage";
import { H2 } from "../Shared/Titles";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

const SealedProductsPreview = () => {
  const { sealedProducts, loadingSealed: isLoading } = useMarketplaceHome();

  return (
    <Card className="bg-card rounded-xl shadow p-6">
      <H2 className="mb-4">Produits scellés</H2>
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          Chargement...
        </div>
      )}

      <div className="flex flex-col gap-4">
        {sealedProducts?.slice(0, 4).map((product) => {
          const imageUrl = getSealedImageUrl(product);
          return (
            <div
              key={product.id}
              className="flex items-center gap-4 p-3 rounded-lg border hover:shadow-md transition bg-background"
            >
              <Link
                href={`/marketplace/sealed/${product.id}`}
                className="flex items-center gap-4 flex-1 min-w-0"
              >
                <div className="flex-shrink-0 w-14 h-14 relative rounded border bg-muted/40 overflow-hidden">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={product.nameEn}
                      fill
                      className="object-contain"
                      sizes="56px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{product.nameEn}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {product.pokemonSet?.name || ""}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {sealedProductTypeLabels[product.productType]}
                  </Badge>
                </div>
              </Link>

              <Button variant="secondary" asChild>
                <Link href={`/marketplace/sealed/${product.id}`}>
                  Voir
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
      <Button variant="outline" asChild size="sm" className="w-full mt-4">
        <Link href="/marketplace/sealed" className="flex items-center gap-2">
          Voir tous les produits scellés
          <ArrowRight className="ml-2 w-4 h-4" />
        </Link>
      </Button>
    </Card>
  );
};

export default SealedProductsPreview;
