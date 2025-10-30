"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { H1 } from "@/components/Shared/Titles";
import { CardCard } from "@/components/Marketplace/CardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { marketplaceService } from "@/services/marketplace.service";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { PaginatedResult } from "@/types/pagination";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { cardStates, languages, currencyOptions } from "@/utils/variables";
import MarketplacePagination from "../_components/MarketplacePagination";

interface FilterState {
  search: string;
  setId?: string;
  serieId?: string;
  rarity?: string;
  currency?: string;
  cardState?: string;
  language?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

export default function MarketplaceCardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
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
    sortBy: searchParams.get("sortBy") || "name",
    sortOrder: (searchParams.get("sortOrder") as "ASC" | "DESC") || "ASC",
  });

  // Fetch sets and series for filters
  const { data: sets } = useQuery({
    queryKey: ["pokemon-sets"],
    queryFn: () => pokemonCardService.getAllSets(),
  });

  const { data: series } = useQuery({
    queryKey: ["pokemon-series"],
    queryFn: () => pokemonCardService.getAllSeries(),
  });

  // Fetch cards with marketplace data
  const { data, isLoading, error } = usePaginatedQuery<PaginatedResult<any>>(
    [
      "marketplace-cards",
      page,
      filters.search,
      filters.setId,
      filters.serieId,
      filters.rarity,
      filters.currency,
      filters.cardState,
      filters.language,
      filters.priceMin,
      filters.priceMax,
      filters.sortBy,
      filters.sortOrder,
    ],
    marketplaceService.getCardsWithMarketplaceData,
    {
      page,
      limit: 24,
      ...filters,
    }
  );

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    setPage(1);

    // Update URL params
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
      sortBy: "name",
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
        <div className="mb-8">
          <H1 className="text-center mb-2" variant="primary">
            Catalogue de cartes
          </H1>
          <p className="text-center text-muted-foreground text-lg">
            Explorez notre collection complète de cartes Pokémon
          </p>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Recherche et filtres
              </CardTitle>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary">{activeFiltersCount} actif(s)</Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  {showFilters ? "Masquer" : "Filtres"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher une carte..."
                  value={filters.search}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="w-full"
                />
              </div>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => updateFilters({ sortBy: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nom</SelectItem>
                  <SelectItem value="price">Prix</SelectItem>
                  <SelectItem value="popularity">Popularité</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.sortOrder}
                onValueChange={(value) =>
                  updateFilters({ sortOrder: value as "ASC" | "DESC" })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASC">Croissant</SelectItem>
                  <SelectItem value="DESC">Décroissant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <Label>Série</Label>
                  <Select
                    value={filters.serieId || "all"}
                    onValueChange={(value) =>
                      updateFilters({ serieId: value === "all" ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les séries" />
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
                  <Label>Extension</Label>
                  <Select
                    value={filters.setId || "all"}
                    onValueChange={(value) =>
                      updateFilters({ setId: value === "all" ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les extensions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les extensions</SelectItem>
                      {sets?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Rareté</Label>
                  <Input
                    placeholder="Ex: Rare Holo"
                    value={filters.rarity || ""}
                    onChange={(e) => updateFilters({ rarity: e.target.value || undefined })}
                  />
                </div>

                <div>
                  <Label>État</Label>
                  <Select
                    value={filters.cardState || "all"}
                    onValueChange={(value) =>
                      updateFilters({ cardState: value === "all" ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les états" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les états</SelectItem>
                      {cardStates.map((cs) => (
                        <SelectItem key={cs.value} value={cs.value}>
                          {cs.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Devise</Label>
                  <Select
                    value={filters.currency || "all"}
                    onValueChange={(value) =>
                      updateFilters({ currency: value === "all" ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les devises" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les devises</SelectItem>
                      {currencyOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Langue</Label>
                  <Select
                    value={filters.language || "all"}
                    onValueChange={(value) =>
                      updateFilters({ language: value === "all" ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les langues" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les langues</SelectItem>
                      {languages.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Prix min (€)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.priceMin || ""}
                    onChange={(e) =>
                      updateFilters({
                        priceMin: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Prix max (€)</Label>
                  <Input
                    type="number"
                    placeholder="9999"
                    value={filters.priceMax || ""}
                    onChange={(e) =>
                      updateFilters({
                        priceMax: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>

                {activeFiltersCount > 0 && (
                  <div className="col-span-full">
                    <Button variant="outline" onClick={resetFilters}>
                      <X className="w-4 h-4 mr-2" />
                      Réinitialiser les filtres
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
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
        ) : data && data.data.length > 0 ? (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              {data.meta.totalItems} carte{data.meta.totalItems > 1 ? "s" : ""} trouvée
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
                setPage={setPage}
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

