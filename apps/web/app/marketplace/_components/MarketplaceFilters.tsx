import React, { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import {useAuth} from "@/contexts/AuthContext";

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
  const {isAuthenticated} = useAuth();
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
              <Link
                  href="/marketplace/create"
              >
                Créer une vente
              </Link>
            </Button>
        )}
      </div>
      {showAdvanced && (
        <div className="flex flex-wrap gap-4 items-end mt-4">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label htmlFor="cardState">État</Label>
            <Select
              id="cardState"
              value={filters.cardState}
              onChange={(e) => setFilters({ cardState: e.target.value })}
            >
              {cardStateOptions.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                >
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label htmlFor="currency">Devise</Label>
            <Select
              id="currency"
              value={filters.currency}
              onChange={(e) => setFilters({ currency: e.target.value })}
            >
              {currencyOptions.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                >
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label htmlFor="sortBy">Trier par</Label>
            <Select
              id="sortBy"
              value={filters.sortBy}
              onChange={(e) => setFilters({ sortBy: e.target.value })}
            >
              {sortOptions.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                >
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-[120px]">
            <Label htmlFor="sortOrder">Ordre</Label>
            <Select
              id="sortOrder"
              value={filters.sortOrder}
              onChange={(e) =>
                setFilters({ sortOrder: e.target.value as "ASC" | "DESC" })
              }
            >
              <option value="ASC">Ascendant</option>
              <option value="DESC">Descendant</option>
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
