import { useTranslations } from "next-intl";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import {
  Filter,
  FolderHeart,
  Library,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
} from "lucide-react";
import { FilterState } from "@/hooks/useMarketplace";
import { PokemonSerieType, PokemonSetType } from "@/types/cardPokemon";
import type { Collection } from "@/types/collection";

/** Available card sources in the deck builder. */
export type CardSource = "catalog" | "collection";

interface FilterSelectProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  options?: { value: string; label: string }[];
}

const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  placeholder,
  value,
  onChange,
  options,
}) => {
  const t = useTranslations("DeckCardFilters");

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("showAll")}</SelectItem>
          {options?.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

interface CardFilterSectionProps {
  searchInput: string;
  setSearchInput: (val: string) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  activeFiltersCount: number;
  series: PokemonSerieType[] | undefined;
  sets: PokemonSetType[] | undefined;
  setPage: (page: number) => void;
  source: CardSource;
  setSource: (source: CardSource) => void;
  collections: Collection[];
  collectionsLoading: boolean;
  selectedCollectionId: string;
  setSelectedCollectionId: (collectionId: string) => void;
  children?: React.ReactNode;
}

/** Provides source selection, search, sorting, and advanced catalogue filters. */
export const CardFilterSection: React.FC<CardFilterSectionProps> = ({
  searchInput,
  setSearchInput,
  filters,
  setFilters,
  activeFiltersCount,
  series,
  sets,
  setPage,
  source,
  setSource,
  collections,
  collectionsLoading,
  selectedCollectionId,
  setSelectedCollectionId,
  children,
}) => {
  const t = useTranslations("DeckCardFilters");
  const tp = useTranslations("Pokedex");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-1 p-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-4 w-4 text-primary" />
              {t("title")}
            </CardTitle>
            <CardDescription className="line-clamp-1 text-xs sm:text-sm">
              {t(source === "catalog" ? "subtitle" : "collectionSubtitle")}
            </CardDescription>
          </div>
          {source === "catalog" && activeFiltersCount > 0 && (
            <Badge variant="secondary" className="shrink-0">
              {t("activeFilters", { count: activeFiltersCount })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        <div className="space-y-3">
          <div className="grid gap-2 lg:grid-cols-[auto_minmax(12rem,22rem)] lg:items-center">
            <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
              <Button
                type="button"
                size="sm"
                variant={source === "catalog" ? "secondary" : "ghost"}
                className="h-8"
                onClick={() => setSource("catalog")}
              >
                <Library className="h-3.5 w-3.5" />
                {t("catalog")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={source === "collection" ? "secondary" : "ghost"}
                className="h-8"
                onClick={() => setSource("collection")}
              >
                <FolderHeart className="h-3.5 w-3.5" />
                {t("myCollections")}
              </Button>
            </div>

            {source === "collection" ? (
              <Select
                value={selectedCollectionId}
                onValueChange={setSelectedCollectionId}
                disabled={collectionsLoading || collections.length === 0}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue
                    placeholder={
                      collectionsLoading
                        ? t("collectionsLoading")
                        : t("chooseCollection")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((collection) => (
                    <SelectItem
                      key={collection.id}
                      value={String(collection.id)}
                    >
                      {collection.masterSet?.name
                        ? t("masterSetName", {
                            name: collection.masterSet.name,
                          })
                        : collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="hidden text-xs text-muted-foreground lg:block">
                {t("catalogHelp")}
              </p>
            )}
          </div>

          <div className="grid gap-2 lg:grid-cols-[minmax(12rem,1fr)_auto]">
            <div>
              <Label className="sr-only">{t("search")}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
            </div>
            {source === "catalog" ? (
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => updateFilters({ sortBy: value })}
                >
                  <SelectTrigger className="h-9 min-w-0 sm:w-[140px]">
                    <SelectValue placeholder={t("sortBy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">{t("name")}</SelectItem>
                    <SelectItem value="localId">{t("number")}</SelectItem>
                    <SelectItem value="price">{t("price")}</SelectItem>
                    <SelectItem value="popularity">
                      {t("popularity")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.sortOrder}
                  onValueChange={(value) =>
                    updateFilters({ sortOrder: value as "ASC" | "DESC" })
                  }
                >
                  <SelectTrigger className="h-9 min-w-0 sm:w-[130px]">
                    <SelectValue placeholder={t("order")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASC">{t("ascending")}</SelectItem>
                    <SelectItem value="DESC">{t("descending")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  className="col-span-2 h-9 px-3 sm:col-span-1"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {t("filters")}
                  {isFiltersOpen ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : null}
          </div>

          {source === "catalog" && isFiltersOpen && (
            <div className="grid animate-in grid-cols-1 gap-3 rounded-lg border bg-muted/20 p-3 duration-200 fade-in slide-in-from-top-2 sm:grid-cols-2 xl:grid-cols-5">
              <FilterSelect
                label={t("series")}
                placeholder={t("allFeminine")}
                value={filters.serieId || "all"}
                onChange={(value) =>
                  updateFilters({
                    serieId: value === "all" ? undefined : value,
                  })
                }
                options={series?.map((s) => ({
                  value: s.id.toString(),
                  label: s.name,
                }))}
              />

              <FilterSelect
                label={t("set")}
                placeholder={t("allFeminine")}
                value={filters.setId || "all"}
                onChange={(value) =>
                  updateFilters({
                    setId: value === "all" ? undefined : value,
                  })
                }
                options={sets?.map((s) => ({
                  value: s.id.toString(),
                  label: s.name,
                }))}
              />

              <FilterSelect
                label={t("energy")}
                placeholder={t("all")}
                value={filters.energyType || "all"}
                onChange={(value) =>
                  updateFilters({
                    energyType: value === "all" ? undefined : value,
                  })
                }
                options={[
                  { value: "Grass", label: tp("typeGrass") },
                  { value: "Fire", label: tp("typeFire") },
                  { value: "Water", label: tp("typeWater") },
                  { value: "Lightning", label: tp("typeLightning") },
                  { value: "Psychic", label: tp("typePsychic") },
                  { value: "Fighting", label: tp("typeFighting") },
                  { value: "Darkness", label: tp("typeDarkness") },
                  { value: "Metal", label: tp("typeMetal") },
                  { value: "Fairy", label: tp("typeFairy") },
                  { value: "Dragon", label: tp("typeDragon") },
                  { value: "Colorless", label: tp("typeColorless") },
                ]}
              />

              <div className="space-y-1.5">
                <Label>{t("rarity")}</Label>
                <Input
                  placeholder={t("rarityPlaceholder")}
                  value={filters.rarity || ""}
                  onChange={(e) =>
                    updateFilters({
                      rarity: e.target.value || undefined,
                    })
                  }
                  className="h-10"
                />
              </div>

              <div className="flex items-end gap-2">
                <div className="space-y-1.5 flex-1">
                  <Label>{t("priceEur")}</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder={t("min")}
                      value={filters.priceMin || ""}
                      onChange={(e) =>
                        updateFilters({
                          priceMin: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-10 px-2"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder={t("max")}
                      value={filters.priceMax || ""}
                      onChange={(e) =>
                        updateFilters({
                          priceMax: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-10 px-2"
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-full flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setFilters({
                      search: "",
                      sortBy: "localId",
                      sortOrder: "DESC",
                    });
                    setSearchInput("");
                    setPage(1);
                  }}
                >
                  <RefreshCcw className="w-3 h-3 mr-2" />
                  {t("resetAll")}
                </Button>
              </div>
            </div>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
};
