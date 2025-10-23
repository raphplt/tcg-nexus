import React, { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface Option {
  label: string;
  value: string;
}

export interface MarketplaceFilters {
  search: string;
  cardState: string;
  currency: string;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

interface MarketplaceFiltersProps {
  filters: MarketplaceFilters;
  setFilters: (filters: Partial<MarketplaceFilters>) => void;
  cardStateOptions: Option[];
  currencyOptions: Option[];
  sortOptions: Option[];
  resetFilters: () => void;
}

const MarketplaceFilters = ({
  filters,
  setFilters,
  cardStateOptions,
  currencyOptions,
  sortOptions,
  resetFilters,
}: MarketplaceFiltersProps) => {
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters({ search: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  return (
    <div className="mb-8 flex flex-col gap-2 bg-card/80 p-4 rounded-lg border border-border">
      <div className="flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-col gap-1 min-w-[180px] flex-1">
          <Label htmlFor="search">Recherche</Label>
          <div className="relative">
            <Input
              id="search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Nom de la carte, vendeur..."
              className="pl-9"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-shrink-0"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          {showAdvanced ? "Masquer les filtres" : "Filtres avancés"}
        </Button>
        {isAuthenticated && (
          <Button
            type="button"
            className="h-10"
            asChild
          >
            <Link href="/marketplace/create">Créer une vente</Link>
          </Button>
        )}
      </div>
      {showAdvanced && (
        <div className="flex flex-wrap gap-4 items-end mt-4">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label htmlFor="cardState">État</Label>
            <Select
              value={filters.cardState || "ALL"}
              onValueChange={(value) =>
                setFilters({ cardState: value === "ALL" ? "" : value })
              }
            >
              <SelectTrigger className="w-full">
                {cardStateOptions.find((opt) => opt.value === filters.cardState)
                  ?.label || "Tous"}
              </SelectTrigger>
              <SelectContent>
                {cardStateOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label htmlFor="currency">Devise</Label>
            <Select
              value={filters.currency || "ALL"}
              onValueChange={(value) =>
                setFilters({ currency: value === "ALL" ? "" : value })
              }
            >
              <SelectTrigger className="w-full">
                {currencyOptions.find((opt) => opt.value === filters.currency)
                  ?.label || "Toutes"}
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label htmlFor="sortBy">Trier par</Label>
            <Select
              value={filters.sortBy || ""}
              onValueChange={(value) => setFilters({ sortBy: value })}
            >
              <SelectTrigger className="w-full">
                {sortOptions.find((opt) => opt.value === filters.sortBy)
                  ?.label || ""}
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-[120px]">
            <Label htmlFor="sortOrder">Ordre</Label>
            <Select
              value={filters.sortOrder}
              onValueChange={(value) =>
                setFilters({ sortOrder: value as "ASC" | "DESC" })
              }
            >
              <SelectTrigger className="w-full">
                {filters.sortOrder === "ASC" ? "Ascendant" : "Descendant"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASC">Ascendant</SelectItem>
                <SelectItem value="DESC">Descendant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={resetFilters}
            variant="outline"
            className="h-10 mt-4"
          >
            Réinitialiser
          </Button>
        </div>
      )}
    </div>
  );
};

export default MarketplaceFilters;
