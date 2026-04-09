"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { H1 } from "@/components/Shared/Titles";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
import { SealedProductCard } from "@/components/Marketplace/SealedProductCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginatedNav } from "@/components/Shared/PaginatedNav";
import { useDebounce } from "@/hooks/useDebounce";
import { useSealedProducts } from "@/hooks/useSealedProducts";
import {
  SealedProductType,
  sealedProductTypeLabels,
} from "@/types/sealed-product";

function SealedListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10),
  );
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [productType, setProductType] = useState<SealedProductType | undefined>(
    (searchParams.get("productType") as SealedProductType) || undefined,
  );

  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, error } = useSealedProducts({
    page,
    limit: 24,
    search: debouncedSearch || undefined,
    productType,
  });

  const products = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="min-h-screen bg-linear-to-br from-secondary/10 to-primary/10 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <MarketplaceBreadcrumb />
        </div>
        <H1 className="mb-6 text-center">Produits scellés</H1>

        <Card className="mb-6">
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Select
              value={productType ?? "all"}
              onValueChange={(value) => {
                setProductType(
                  value === "all" ? undefined : (value as SealedProductType),
                );
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type de produit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.values(SealedProductType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {sealedProductTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6">
            <CardContent className="pt-6 text-center text-destructive">
              Une erreur est survenue lors du chargement des produits.
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Aucun produit scellé trouvé.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <SealedProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="mt-8">
            <PaginatedNav
              meta={meta}
              page={page}
              onPageChange={(p) => {
                setPage(p);
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(p));
                router.push(`?${params.toString()}`);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SealedListingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-linear-to-br from-secondary/10 to-primary/10 py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-10 w-64 mx-auto mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <SealedListingsContent />
    </Suspense>
  );
}
