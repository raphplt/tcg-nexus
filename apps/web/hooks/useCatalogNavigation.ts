import { useState, type Dispatch, type SetStateAction } from "react";
import type { FilterState } from "@/hooks/useMarketplace";
import type { PokemonSetType } from "@/types/cardPokemon";

interface CatalogNavigationOptions {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  /** Debounced search term. */
  search: string;
  /** Browsing only applies to the catalogue, not to personal collections. */
  enabled?: boolean;
}

/** Drives the series → sets → cards drill-down shared by the card pickers. */
export function useCatalogNavigation({
  filters,
  setFilters,
  search,
  enabled = true,
}: CatalogNavigationOptions) {
  const [showAllCards, setShowAllCards] = useState(false);
  // A search or a card filter always lists cards directly.
  const hasCardCriteria =
    Boolean(search || filters.setId || filters.energyType || filters.rarity) ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined;

  const browseSerie = (serieId?: string) => {
    setShowAllCards(false);
    setFilters((prev) => ({ ...prev, serieId, setId: undefined }));
  };

  const browseSet = (set: PokemonSetType) => {
    setShowAllCards(false);
    setFilters((prev) => ({
      ...prev,
      serieId: set.serie?.id ?? prev.serieId,
      setId: set.id,
      sortBy: "localId",
      sortOrder: "ASC",
    }));
  };

  return {
    isBrowsing: enabled && !showAllCards && !hasCardCriteria,
    showAllCards,
    serieId: filters.serieId,
    setId: filters.setId,
    browseSerie,
    browseSet,
    showAll: () => setShowAllCards(true),
    reset: () => setShowAllCards(false),
  };
}

export type CatalogNavigation = ReturnType<typeof useCatalogNavigation>;
