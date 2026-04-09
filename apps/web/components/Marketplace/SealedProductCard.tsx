"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  SealedProduct,
  sealedProductTypeLabels,
} from "@/types/sealed-product";
import { getSealedImageUrl } from "@/utils/sealedImage";

interface SealedProductCardProps {
  product: SealedProduct;
  className?: string;
}

export function SealedProductCard({
  product,
  className,
}: SealedProductCardProps) {
  const imageUrl = getSealedImageUrl(product);
  const typeLabel = sealedProductTypeLabels[product.productType];

  return (
    <Link href={`/marketplace/sealed/${product.id}`}>
      <Card
        className={cn(
          "group hover:shadow-lg transition-all duration-200 cursor-pointer h-full flex flex-col",
          className,
        )}
      >
        <CardHeader className="pb-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg mb-3 bg-muted/40">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.nameEn}
                fill
                className="object-contain group-hover:scale-105 transition-transform duration-200"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Pas d'image
              </div>
            )}
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
              {product.nameEn}
            </h3>
            {product.pokemonSet && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {product.pokemonSet.name}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 mt-auto">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {typeLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
