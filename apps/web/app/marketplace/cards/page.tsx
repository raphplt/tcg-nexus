"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { H1 } from "@/components/Shared/Titles";
import { CardCard } from "@/components/Marketplace/CardCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cardEventTracker } from "@/services/card-event-tracker.service";
import MarketplacePagination from "../_components/MarketplacePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
import { useMarketplaceCards, FilterState } from "@/hooks/useMarketplace";
import MarketplaceSearch from "../_components/MarketplaceSearch";

export default function MarketplaceCardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10),
  );
  const [showFilters, setShowFilters] = useState(false);

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

    const pageParam = searchParams.get("page");
    if (pageParam) {
      const pageNum = parseInt(pageParam, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        setPage(pageNum);
      } else {
        setPage(1);
      }
    } else {
      setPage(1);
    }
  }, [searchParams]);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    setPage(1);

    const params = new URLSearchParams();
    Object.entries(updated).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        params.set(key, String(value));
      }
    });
    router.push(`/marketplace/cards?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        params.set(key, String(value));
      }
    });
    params.set("page", String(newPage));
    router.push(`/marketplace/cards?${params.toString()}`, { scroll: false });
  };

  const resetFilters = () => {
    const defaultFilters: FilterState = {
      search: "",
      sortBy: "localId",
      sortOrder: "ASC",
    };
    setFilters(defaultFilters);
    setPage(1);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <MarketplaceBreadcrumb />
        </div>
        <div className="mb-8">
          <H1
            className="text-center mb-2"
            variant="primary"
          >
            Catalogue de cartes
          </H1>
          <p className="text-center text-muted-foreground text-lg">
            Explorez notre collection complète de cartes Pokémon
          </p>
        </div>

        <MarketplaceSearch
          filters={filters}
          setFilters={setFilters}
          activeFiltersCount={activeFiltersCount}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          resetFilters={resetFilters}
          series={series || []}
          sets={sets || []}
          updateFilters={updateFilters}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-80"
              />
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              Erreur lors du chargement des cartes
            </CardContent>
          </Card>
        ) : data && data.data.length > 0 ? (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              {data.meta.totalItems} carte{data.meta.totalItems > 1 ? "s" : ""}{" "}
              trouvée
              {data.meta.totalItems > 1 ? "s" : ""}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {data.data.map((item: any) => {
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
            {data.meta && (
              <MarketplacePagination
                meta={data.meta}
                page={page}
                setPage={handlePageChange}
              />
            )}
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

