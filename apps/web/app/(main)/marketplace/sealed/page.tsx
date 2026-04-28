"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
import { SealedProductCard } from "@/components/Marketplace/SealedProductCard";
import { PaginatedNav } from "@/components/Shared/PaginatedNav";
import { H1 } from "@/components/Shared/Titles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { useSealedProducts } from "@/hooks/useSealedProducts";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { SealedSortBy } from "@/services/sealed-product.service";
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
  const [setId, setSetId] = useState<string | undefined>(
    searchParams.get("setId") || undefined,
  );
  const [seriesId, setSeriesId] = useState<string | undefined>(
    searchParams.get("seriesId") || undefined,
  );
  const [priceMin, setPriceMin] = useState<string>(
    searchParams.get("priceMin") || "",
  );
  const [priceMax, setPriceMax] = useState<string>(
    searchParams.get("priceMax") || "",
  );
  const [sortBy, setSortBy] = useState<SealedSortBy>(
    (searchParams.get("sortBy") as SealedSortBy) || SealedSortBy.NAME,
  );

  const debouncedSearch = useDebounce(search, 350);
  const debouncedPriceMin = useDebounce(priceMin, 400);
  const debouncedPriceMax = useDebounce(priceMax, 400);

  const { data: sets } = useQuery({
    queryKey: ["pokemon-sets"],
    queryFn: () => pokemonCardService.getAllSets(),
  });
  const { data: series } = useQuery({
    queryKey: ["pokemon-series"],
    queryFn: () => pokemonCardService.getAllSeries(),
  });

  const parsedPriceMin = debouncedPriceMin
    ? Number(debouncedPriceMin)
    : undefined;
  const parsedPriceMax = debouncedPriceMax
    ? Number(debouncedPriceMax)
    : undefined;

  const { data, isLoading, error } = useSealedProducts({
    page,
    limit: 24,
    search: debouncedSearch || undefined,
    productType,
    setId,
    seriesId,
    priceMin: Number.isFinite(parsedPriceMin) ? parsedPriceMin : undefined,
    priceMax: Number.isFinite(parsedPriceMax) ? parsedPriceMax : undefined,
    sortBy,
  });

  const products = data?.data || [];
  const meta = data?.meta;

  const updateUrl = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.push(`?${params.toString()}`);
  };

  const resetFilters = () => {
    setSearch("");
    setProductType(undefined);
    setSetId(undefined);
    setSeriesId(undefined);
    setPriceMin("");
    setPriceMax("");
    setSortBy(SealedSortBy.NAME);
    setPage(1);
    router.push("?");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-secondary/10 to-primary/10 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <MarketplaceBreadcrumb />
        </div>
        <H1 className="mb-6 text-center">Produits scellés</H1>

        <Card className="mb-6">
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label className="text-xs">Recherche</Label>
              <Input
                placeholder="Rechercher un produit..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={productType ?? "all"}
                onValueChange={(value) => {
                  const next =
                    value === "all" ? undefined : (value as SealedProductType);
                  setProductType(next);
                  setPage(1);
                  updateUrl({ productType: next, page: undefined });
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
            </div>

            <div>
              <Label className="text-xs">Tri</Label>
              <Select
                value={sortBy}
                onValueChange={(value) => {
                  const next = value as SealedSortBy;
                  setSortBy(next);
                  setPage(1);
                  updateUrl({ sortBy: next, page: undefined });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SealedSortBy.NAME}>Nom</SelectItem>
                  <SelectItem value={SealedSortBy.RECENT}>
                    Plus récents
                  </SelectItem>
                  <SelectItem value={SealedSortBy.POPULARITY}>
                    Popularité
                  </SelectItem>
                  <SelectItem value={SealedSortBy.PRICE_ASC}>
                    Prix croissant
                  </SelectItem>
                  <SelectItem value={SealedSortBy.PRICE_DESC}>
                    Prix décroissant
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Série</Label>
              <Select
                value={seriesId ?? "all"}
                onValueChange={(value) => {
                  const next = value === "all" ? undefined : value;
                  setSeriesId(next);
                  setPage(1);
                  updateUrl({ seriesId: next, page: undefined });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Série" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les séries</SelectItem>
                  {series?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Set</Label>
              <Select
                value={setId ?? "all"}
                onValueChange={(value) => {
                  const next = value === "all" ? undefined : value;
                  setSetId(next);
                  setPage(1);
                  updateUrl({ setId: next, page: undefined });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sets</SelectItem>
                  {sets?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Prix min</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0"
                value={priceMin}
                onChange={(e) => {
                  setPriceMin(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <Label className="text-xs">Prix max</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="∞"
                value={priceMax}
                onChange={(e) => {
                  setPriceMax(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={resetFilters}
              >
                Réinitialiser
              </Button>
            </div>
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
                updateUrl({ page: String(p) });
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
