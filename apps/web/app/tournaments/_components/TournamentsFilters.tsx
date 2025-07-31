import React, { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();

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
        {user?.isPro && (
          <div className="flex justify-end">
            <Link href="/tournaments/create">
              <Button variant="default">Créer un tournoi</Button>
            </Link>
          </div>
        )}
      </div>
      {showAdvanced && (
        <div className="flex flex-wrap gap-4 items-end mt-4">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label htmlFor="type">Type</Label>
            <Select
              value={filters.type || "ALL"}
              onValueChange={(value) =>
                setFilters({ type: value === "ALL" ? "" : value })
              }
            >
              <SelectTrigger className="w-full">
                {typeOptions.find((opt) => opt.value === filters.type)?.label ||
                  "Tous"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                {typeOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={
                      opt.value || opt.label.replace(/\s+/g, "_").toUpperCase()
                    }
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label htmlFor="status">Statut</Label>
            <Select
              value={filters.status || "ALL"}
              onValueChange={(value) =>
                setFilters({ status: value === "ALL" ? "" : value })
              }
            >
              <SelectTrigger className="w-full">
                {statusOptions.find((opt) => opt.value === filters.status)
                  ?.label || "Tous les statuts"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={
                      opt.value || opt.label.replace(/\s+/g, "_").toUpperCase()
                    }
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
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
}
