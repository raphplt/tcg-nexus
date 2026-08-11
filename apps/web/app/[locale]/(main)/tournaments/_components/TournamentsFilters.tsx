import { useTranslations } from "next-intl";
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
import { Link } from "@/i18n/navigation";
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
  const t = useTranslations("TournamentsFilters");
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
          <Label htmlFor="search">{t("search")}</Label>
          <div className="relative">
            <Input
              id="search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("namePlaceholder")}
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
          {showAdvanced ? t("hideFilters") : t("advancedFilters")}
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
                  t("all")}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("all")}</SelectItem>
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
            <Label htmlFor="status">{t("status")}</Label>
            <Select
              value={filters.status || "ALL"}
              onValueChange={(value) =>
                setFilters({ status: value === "ALL" ? "" : value })
              }
            >
              <SelectTrigger className="w-full">
                {statusOptions.find((opt) => opt.value === filters.status)
                  ?.label || t("allStatuses")}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
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
            <Label htmlFor="location">{t("location")}</Label>
            <Input
              id="location"
              type="text"
              value={filters.location}
              onChange={(e) => setFilters({ location: e.target.value })}
              placeholder="Ville, salle..."
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label>{t("startDateFrom")}</Label>
            <Input
              type="date"
              value={filters.startDateFrom}
              onChange={(e) => setFilters({ startDateFrom: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label>{t("startDateTo")}</Label>
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
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-[120px]">
            <Label htmlFor="sortOrder">{t("order")}</Label>
            <Select
              value={filters.sortOrder}
              onValueChange={(value) =>
                setFilters({ sortOrder: value as "ASC" | "DESC" })
              }
            >
              <SelectTrigger className="w-full">
                {filters.sortOrder === "ASC" ? t("ascending") : t("descending")}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASC">{t("ascending")}</SelectItem>
                <SelectItem value="DESC">{t("descending")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={resetFilters}
            variant="outline"
            className="h-10 mt-4"
          >
            {t("reset")}
          </Button>
        </div>
      )}
    </div>
  );
}
