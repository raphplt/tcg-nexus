"use client";

import { Check, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useMemo, useState } from "react";
import { CatalogExplorer } from "@/components/Catalog/CatalogExplorer";
import { InfiniteScrollTrigger } from "@/components/Shared/InfiniteScrollTrigger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SmartImage } from "@/components/ui/SmartImage";
import { useCatalogNavigation } from "@/hooks/useCatalogNavigation";
import { useDebounce } from "@/hooks/useDebounce";
import {
  FilterState,
  useInfiniteMarketplaceCards,
} from "@/hooks/useMarketplace";
import { cn } from "@/lib/utils";
import { PokemonCardType } from "@/types/cardPokemon";
import { getCardImage } from "@/utils/images";

const DEFAULT_FILTERS: FilterState = {
  search: "",
  sortBy: "localId",
  sortOrder: "ASC",
};
const CARD_GRID =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,7.5rem),1fr))] gap-2";

// Enter in a picker field must not submit the surrounding listing form.
const preventSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key === "Enter") event.preventDefault();
};

interface ListingCardPickerProps {
  selectedCardId?: string;
  onSelect: (card: PokemonCardType) => void;
}

/** Finds the card to sell by browsing series and sets, or by searching directly. */
export function ListingCardPicker({
  selectedCardId,
  onSelect,
}: ListingCardPickerProps) {
  const t = useTranslations("CreateListing");
  const [searchInput, setSearchInput] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const search = useDebounce(searchInput, 350);

  const nav = useCatalogNavigation({ filters, setFilters, search });
  const filtersWithSearch = useMemo(
    () => ({ ...filters, search }),
    [filters, search],
  );
  const {
    items,
    sets,
    series,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteMarketplaceCards(filtersWithSearch, 24, !nav.isBrowsing);
  const cards = (items as { card: PokemonCardType }[]).map((item) => item.card);

  const updateFilters = (next: Partial<FilterState>) =>
    setFilters((prev) => ({ ...prev, ...next }));

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput("");
    nav.reset();
  };

  const hasActiveFilters =
    Boolean(filters.rarity) ||
    filters.sortBy !== DEFAULT_FILTERS.sortBy ||
    filters.sortOrder !== DEFAULT_FILTERS.sortOrder;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={preventSubmit}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant={isFiltersOpen || hasActiveFilters ? "secondary" : "outline"}
          aria-expanded={isFiltersOpen}
          aria-label={t("filters")}
          onClick={() => setIsFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">{t("filters")}</span>
        </Button>
      </div>

      {isFiltersOpen && (
        <div className="grid animate-in gap-2 rounded-lg border bg-muted/30 p-2 duration-200 fade-in sm:grid-cols-[1fr_1fr_1fr_auto]">
          <Select
            value={filters.sortBy}
            onValueChange={(sortBy) => updateFilters({ sortBy })}
          >
            <SelectTrigger aria-label={t("sortBy")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="localId">{t("number")}</SelectItem>
              <SelectItem value="name">{t("name")}</SelectItem>
              <SelectItem value="price">{t("price")}</SelectItem>
              <SelectItem value="popularity">{t("popularity")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.sortOrder}
            onValueChange={(sortOrder) =>
              updateFilters({ sortOrder: sortOrder as "ASC" | "DESC" })
            }
          >
            <SelectTrigger aria-label={t("order")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ASC">{t("ascending")}</SelectItem>
              <SelectItem value="DESC">{t("descending")}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={filters.rarity ?? ""}
            onChange={(event) =>
              updateFilters({ rarity: event.target.value || undefined })
            }
            onKeyDown={preventSubmit}
            placeholder={t("rarityPlaceholder")}
            aria-label={t("rarity")}
            className="h-9"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
          >
            <RotateCcw className="h-4 w-4" />
            {t("reset")}
          </Button>
        </div>
      )}

      <CatalogExplorer nav={nav} series={series} sets={sets}>
        {isLoading ? (
          <div className={CARD_GRID}>
            {Array.from({ length: 12 }).map((_: unknown, i: number) => (
              <div
                key={i}
                className="aspect-3/4 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : cards.length ? (
          <div className="space-y-3">
            <div className={CARD_GRID}>
              {cards.map((card) => {
                const isSelected = card.id === selectedCardId;
                return (
                  <button
                    key={card.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(card)}
                    className={cn(
                      "group relative flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected && "border-primary ring-2 ring-primary",
                    )}
                  >
                    <span className="relative block aspect-3/4 bg-muted/40">
                      <SmartImage
                        src={getCardImage(card, "low")}
                        fallbackSrc="/images/carte-pokemon-dos.jpg"
                        alt=""
                        className="h-full w-full object-contain"
                      />
                      {isSelected && (
                        <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                    <span className="flex flex-col gap-0.5 p-1.5">
                      <span className="truncate text-xs font-semibold">
                        {card.name}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {[card.localId && `#${card.localId}`, card.set?.name]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <InfiniteScrollTrigger
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={() => void fetchNextPage()}
            />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("noResults")}
          </p>
        )}
      </CatalogExplorer>
    </div>
  );
}
