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

export interface DecksFiltersTypes {
  search: string;
  sortBy: string;
  format: string;
  sortOrder: "ASC" | "DESC";
}
interface DecksFiltersProps {
  filters: DecksFiltersTypes;
  setFilters: (filters: Partial<DecksFiltersTypes>) => void;
  formatOptions: Option[];
  sortOptions: Option[];
  resetFilters: () => void;
}

const DecksFilters = ({
  filters,
  setFilters,
  formatOptions,
  sortOptions,
  resetFilters,
}: DecksFiltersProps) => {
  const t = useTranslations("DecksFilters");
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
        {isAuthenticated && (
          <Button type="button" className="h-10" asChild>
            <Link href="/decks/create">{t("create")}</Link>
          </Button>
        )}
      </div>
      {showAdvanced && (
        <div className="flex flex-wrap gap-4 items-end mt-4">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label htmlFor="format">{t("type")}</Label>
            <Select
              value={filters.format || "ALL"}
              onValueChange={(value) =>
                setFilters({ format: value === "ALL" ? "" : value })
              }
            >
              <SelectTrigger className="w-full">
                {formatOptions.find((opt) => opt.value === filters.format)
                  ?.label || t("all")}
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label htmlFor="sortBy">{t("sortBy")}</Label>
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
};

export default DecksFilters;
