"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { H1 } from "@/components/Shared/Titles";
import { CardCard } from "@/components/Marketplace/CardCard";
import { CardListItem } from "@/components/Marketplace/CardListItem";
import { ViewToggle } from "@/components/Marketplace/ViewToggle";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cardEventTracker } from "@/services/card-event-tracker.service";
import { useDebounce } from "@/hooks/useDebounce";
import { useViewMode } from "@/hooks/useViewMode";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
import { useMarketplaceCards, FilterState } from "@/hooks/useMarketplace";
import MarketplaceSearch from "../_components/MarketplaceSearch";
import { Spinner } from "@/components/ui/spinner";

export default function MarketplaceCardsPage() {
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
      <MarketplaceCardsContent />
    </Suspense>
  );
}

function MarketplaceCardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useViewMode("grid");
  const observerRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get("search") || "",
    setId: searchParams.get("setId") || undefined,
    serieId: searchParams.get("serieId") || undefined,
    rarity: searchParams.get("rarity") || undefined,
    currency: searchParams.get("currency") || undefined,
    cardState: searchParams.get("cardState") || undefined,
    language: searchParams.get("language") || undefined,
    priceMin: searchParams.get("priceMin")
      ? parseFloat(searchParams.get("priceMin")!)
      : undefined,
    priceMax: searchParams.get("priceMax")
      ? parseFloat(searchParams.get("priceMax")!)
      : undefined,
    sortBy: searchParams.get("sortBy") || "localId",
    sortOrder: (searchParams.get("sortOrder") as "ASC" | "DESC") || "ASC",
  });

  const { sets, series, data, isLoading, error } = useMarketplaceCards(
    filters,
    page,
  );

  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    if (debouncedSearch && debouncedSearch.trim() && data?.data) {
      data.data.forEach((item: any) => {
        const card = item.card || item;
        if (card?.id) {
          cardEventTracker.trackSearch(card.id, debouncedSearch.trim(), {
            resultsCount: data.meta.totalItems,
          });
        }
      });
    }
  }, [debouncedSearch, data]);

  // Effect to handle URL change
  useEffect(() => {
    const newFilters: FilterState = {
      search: searchParams.get("search") || "",
      setId: searchParams.get("setId") || undefined,
      serieId: searchParams.get("serieId") || undefined,
      rarity: searchParams.get("rarity") || undefined,
      currency: searchParams.get("currency") || undefined,
      cardState: searchParams.get("cardState") || undefined,
      language: searchParams.get("language") || undefined,
      priceMin: searchParams.get("priceMin")
        ? parseFloat(searchParams.get("priceMin")!)
        : undefined,
      priceMax: searchParams.get("priceMax")
        ? parseFloat(searchParams.get("priceMax")!)
        : undefined,
      sortBy: searchParams.get("sortBy") || "localId",
      sortOrder: (searchParams.get("sortOrder") as "ASC" | "DESC") || "ASC",
    };

    setFilters(newFilters);
    setPage(1);
    setItems([]);
  }, [searchParams]);

  // Accumulate items when new data is received
  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setItems(data.data);
      } else {
        setItems((prev) => {
          const existingIds = new Set(prev.map(i => i.card?.id || i.id));
          const newItems = data.data.filter((i: any) => !existingIds.has(i.card?.id || i.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [data, page]);

  const hasMore = data ? page < data.meta.totalPages : false;

  // IntersectionObserver for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting && hasMore && !isLoading) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading]);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    setPage(1);
    setItems([]);

    const params = new URLSearchParams();
    Object.entries(updated).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        params.set(key, String(value));
      }
    });
    router.push(`/marketplace/cards?${params.toString()}`);
  };

  const resetFilters = () => {
    const defaultFilters: FilterState = {
      search: "",
      sortBy: "localId",
      sortOrder: "ASC",
    };
    setFilters(defaultFilters);
    setPage(1);
    setItems([]);
    router.push("/marketplace/cards");
  };

  const activeFiltersCount =
    (filters.search ? 1 : 0) +
    (filters.setId ? 1 : 0) +
    (filters.serieId ? 1 : 0) +
    (filters.rarity ? 1 : 0) +
    (filters.currency ? 1 : 0) +
    (filters.cardState ? 1 : 0) +
    (filters.language ? 1 : 0) +
    (filters.priceMin !== undefined ? 1 : 0) +
    (filters.priceMax !== undefined ? 1 : 0);

  // console.log('cards', data?.data);

  return (
    <div className="min-h-screen bg-linear-to-br from-secondary/10 to-primary/10 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <MarketplaceBreadcrumb />
        </div>
        <div className="mb-8">
          <H1 className="text-center mb-2" variant="primary">
            Catalogue de cartes
          </H1>
          <p className="text-center text-muted-foreground text-lg">
            Explorez notre collection complète de cartes Pokémon
          </p>
        </div>

        <MarketplaceSearch
          filters={filters}
          activeFiltersCount={activeFiltersCount}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          resetFilters={resetFilters}
          series={series || []}
          sets={sets || []}
          updateFilters={updateFilters}
        />

        {isLoading && page === 1 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              Erreur lors du chargement des cartes
            </CardContent>
          </Card>
        ) : items.length > 0 ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {data?.meta?.totalItems || items.length} carte
                {(data?.meta?.totalItems || items.length) > 1 ? "s" : ""} trouvée
                {(data?.meta?.totalItems || items.length) > 1 ? "s" : ""}
              </span>
              <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {items.map((item: any) => {
                  const card = item.card || item;
                  return (
                    <CardCard
                      key={card.id}
                      card={card}
                      minPrice={item.minPrice}
                      avgPrice={item.avgPrice}
                      listingCount={item.listingCount}
                      currency={filters.currency}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-8">
                {items.map((item: any) => {
                  const card = item.card || item;
                  return (
                    <CardListItem
                      key={card.id}
                      card={card}
                      minPrice={item.minPrice}
                      avgPrice={item.avgPrice}
                      listingCount={item.listingCount}
                      currency={filters.currency}
                    />
                  );
                })}
              </div>
            )}
            
            {/* Elément sentinelle pour le scroll infini */}
            <div ref={observerRef} className="py-8 flex justify-center items-center">
              {isLoading && page > 1 && <Spinner size="medium" />}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune carte trouvée avec ces critères
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
