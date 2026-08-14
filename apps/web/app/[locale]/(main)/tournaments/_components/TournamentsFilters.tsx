import { Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

interface Option {
  label: string;
  value: string;
}

/** Tournament filters supported by the discovery page. */
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

const quickStatuses = [
  { value: "", translationKey: "quickAll" },
  { value: "registration_open", translationKey: "quickOpen" },
  { value: "in_progress", translationKey: "quickLive" },
  { value: "finished", translationKey: "quickFinished" },
] as const;

/**
 * Displays the primary search and status controls while keeping less common
 * filters available on demand.
 *
 * @param props - Current filter values, options and update callbacks.
 * @returns A compact tournament filter toolbar.
 */
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
  const debouncedSearch = useDebounce(searchInput, 350);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.type ||
      filters.status ||
      filters.location ||
      filters.startDateFrom ||
      filters.startDateTo,
  );

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch, filters.search, setFilters]);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  return (
    <div className="tournament-filter-bar">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="tournament-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className="h-11 bg-background pl-10 pr-10"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label={t("clearSearch")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div
          className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
          aria-label={t("status")}
        >
          {quickStatuses.map((status) => (
            <button
              key={status.translationKey}
              type="button"
              onClick={() => setFilters({ status: status.value })}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition",
                filters.status === status.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={filters.status === status.value}
            >
              {t(status.translationKey)}
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0"
          onClick={() => setShowAdvanced((visible) => !visible)}
          aria-expanded={showAdvanced}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showAdvanced ? t("hideFilters") : t("advancedFilters")}
        </Button>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 shrink-0"
            onClick={resetFilters}
          >
            <X className="h-4 w-4" />
            {t("reset")}
          </Button>
        )}
      </div>

      {showAdvanced && (
        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label={t("type")} htmlFor="tournament-type">
            <Select
              value={filters.type || "ALL"}
              onValueChange={(value) =>
                setFilters({ type: value === "ALL" ? "" : value })
              }
            >
              <SelectTrigger
                id="tournament-type"
                className="w-full bg-background"
              >
                {typeOptions.find((option) => option.value === filters.type)
                  ?.label || t("all")}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("all")}</SelectItem>
                {typeOptions
                  .filter((option) => option.value)
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label={t("status")} htmlFor="tournament-status">
            <Select
              value={filters.status || "ALL"}
              onValueChange={(value) =>
                setFilters({ status: value === "ALL" ? "" : value })
              }
            >
              <SelectTrigger
                id="tournament-status"
                className="w-full bg-background"
              >
                {statusOptions.find((option) => option.value === filters.status)
                  ?.label || t("allStatuses")}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
                {statusOptions
                  .filter((option) => option.value)
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label={t("location")} htmlFor="tournament-location">
            <Input
              id="tournament-location"
              value={filters.location}
              onChange={(event) => setFilters({ location: event.target.value })}
              placeholder={t("locationPlaceholder")}
              className="bg-background"
            />
          </FilterField>

          <FilterField label={t("sortBy")} htmlFor="tournament-sort">
            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters({ sortBy: value })}
            >
              <SelectTrigger
                id="tournament-sort"
                className="w-full bg-background"
              >
                {sortOptions.find((option) => option.value === filters.sortBy)
                  ?.label || t("sortBy")}
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label={t("startDateFrom")} htmlFor="start-date-from">
            <Input
              id="start-date-from"
              type="date"
              value={filters.startDateFrom}
              onChange={(event) =>
                setFilters({ startDateFrom: event.target.value })
              }
              className="bg-background"
            />
          </FilterField>

          <FilterField label={t("startDateTo")} htmlFor="start-date-to">
            <Input
              id="start-date-to"
              type="date"
              value={filters.startDateTo}
              onChange={(event) =>
                setFilters({ startDateTo: event.target.value })
              }
              className="bg-background"
            />
          </FilterField>

          <FilterField label={t("order")} htmlFor="tournament-order">
            <Select
              value={filters.sortOrder}
              onValueChange={(value) =>
                setFilters({ sortOrder: value as "ASC" | "DESC" })
              }
            >
              <SelectTrigger
                id="tournament-order"
                className="w-full bg-background"
              >
                {filters.sortOrder === "ASC" ? t("ascending") : t("descending")}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASC">{t("ascending")}</SelectItem>
                <SelectItem value="DESC">{t("descending")}</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </div>
      )}
    </div>
  );
}

function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
