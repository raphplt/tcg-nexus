"use client";

import { ArrowRight, Package, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { H2 } from "@/components/Shared/Titles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePopularSealedProducts,
  useRecentSealedProducts,
} from "@/hooks/useSealedProducts";
import { cn } from "@/lib/utils";
import { SealedProductCard } from "./SealedProductCard";

type Mode = "popular" | "recent";

interface SealedProductsPreviewProps {
  defaultMode?: Mode;
  limit?: number;
  className?: string;
}

/**
 * Mise en avant des produits scellés sur la home marketplace.
 * Toggle entre "populaire" (basé sur les events) et "récent" (createdAt).
 */
export function SealedProductsPreview({
  defaultMode = "popular",
  limit = 8,
  className,
}: SealedProductsPreviewProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);

  const { data: popular, isLoading: loadingPopular } =
    usePopularSealedProducts(limit);
  const { data: recent, isLoading: loadingRecent } =
    useRecentSealedProducts(limit);

  const products = mode === "popular" ? popular : recent;
  const isLoading = mode === "popular" ? loadingPopular : loadingRecent;

  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary" />
          <H2>Produits scellés</H2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={mode === "popular" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("popular")}
          >
            <Star className="w-4 h-4 mr-2" />
            Populaires
          </Button>
          <Button
            variant={mode === "recent" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("recent")}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Récents
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/marketplace/sealed">
              Voir tout <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.slice(0, limit).map((product) => (
            <SealedProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun produit scellé pour le moment
          </CardContent>
        </Card>
      )}
    </section>
  );
}
