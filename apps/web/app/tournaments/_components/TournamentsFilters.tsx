import React, { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, SlidersHorizontal } from "lucide-react";

interface Option {
  label: string;
  value: string;
}

export interface Filters {
  search: string;
  type: string;
  status: string;
  location: string;
  startDateFrom: string;
  startDateTo: string;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

interface TournamentsFiltersProps {
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;
  typeOptions: Option[];
  statusOptions: Option[];
  sortOptions: Option[];
  resetFilters: () => void;
}

export function TournamentsFilters({
  filters,
  setFilters,
  typeOptions,
  statusOptions,
  sortOptions,
  resetFilters,
}: TournamentsFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
              placeholder="Nom du tournoi..."
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
      </div>
      {showAdvanced && (
        <div className="flex flex-wrap gap-4 items-end mt-4">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label htmlFor="type">Type</Label>
            <Select
              id="type"
              value={filters.type}
              onChange={(e) => setFilters({ type: e.target.value })}
            >
              {typeOptions.map((opt) => (
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
            <Label htmlFor="status">Statut</Label>
            <Select
              id="status"
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
            >
              {statusOptions.map((opt) => (
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
            <Label htmlFor="location">Lieu</Label>
            <Input
              id="location"
              type="text"
              value={filters.location}
              onChange={(e) => setFilters({ location: e.target.value })}
              placeholder="Ville, salle..."
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label>Date de début (du)</Label>
            <Input
              type="date"
              value={filters.startDateFrom}
              onChange={(e) => setFilters({ startDateFrom: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label>Date de début (au)</Label>
            <Input
              type="date"
              value={filters.startDateTo}
              onChange={(e) => setFilters({ startDateTo: e.target.value })}
            />
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
}
