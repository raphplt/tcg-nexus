"use client";

import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Check,
  ChevronRight,
  Grid as GridIcon,
  Layers,
  List as ListIcon,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SmartImage } from "@/components/ui/SmartImage";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type {
  PokemonCardType,
  PokemonSerieType,
  PokemonSetType,
} from "@/types/cardPokemon";
import { useLocale, useTranslations } from "next-intl";
import {
  getCardImage,
  getRarityImage,
  getSeriesLogo,
  getSetLogo,
  getSetSymbol,
} from "@/utils/images";

interface PokemonCardsTableProps {
  initialPage?: number;
  itemsPerPage?: number;
}

type PokemonCardQueryParams = {
  page: number;
  limit: number;
  setId?: string;
  serieId?: string;
  rarity?: string;
  type?: string;
  search?: string;
};

function RarityIcon({ rarity }: { rarity: string }) {
  const icon = getRarityImage(rarity);
  if (!icon) return null;

  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
    >
      <img alt="" className="max-h-4 max-w-5 object-contain" src={icon} />
    </span>
  );
}

const POKEMON_TYPES = [
  { value: "Grass", labelKey: "typeGrass" },
  { value: "Fire", labelKey: "typeFire" },
  { value: "Water", labelKey: "typeWater" },
  { value: "Lightning", labelKey: "typeLightning" },
  { value: "Psychic", labelKey: "typePsychic" },
  { value: "Fighting", labelKey: "typeFighting" },
  { value: "Darkness", labelKey: "typeDarkness" },
  { value: "Metal", labelKey: "typeMetal" },
  { value: "Dragon", labelKey: "typeDragon" },
  { value: "Fairy", labelKey: "typeFairy" },
  { value: "Colorless", labelKey: "typeColorless" },
];

/**
 * Displays the Pokémon catalog explorer with set-aware filters and card views.
 *
 * @param props - Pagination configuration for the catalog.
 * @returns Interactive Pokémon card explorer.
 */
export function PokemonCardsTable({
  initialPage = 1,
  itemsPerPage = 12,
}: PokemonCardsTableProps) {
  const t = useTranslations("Pokedex");
  const locale = useLocale();
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const [cards, setCards] = useState<PokemonCardType[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  const [series, setSeries] = useState<PokemonSerieType[]>([]);
  const [sets, setSets] = useState<PokemonSetType[]>([]);
  const [selectedSerie, setSelectedSerie] = useState<PokemonSerieType | null>(
    null,
  );
  const [selectedSet, setSelectedSet] = useState<PokemonSetType | null>(null);

  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [availableRarities, setAvailableRarities] = useState<string[]>([]);
  const [raritiesLoading, setRaritiesLoading] = useState(false);
  const [displayFormat, setDisplayFormat] = useState<"grid" | "table">("grid");

  const observerRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [allSeries, allSets] = await Promise.all([
          pokemonCardService.getAllSeries(),
          pokemonCardService.getAllSets(),
        ]);
        setSeries(allSeries);

        const sortedSets = [...allSets].sort((a, b) => {
          const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return dateB - dateA;
        });
        setSets(sortedSets);
      } catch (err) {
        console.error(t("metadataError"), err);
      }
    };
    loadMetadata();
  }, []);

  useEffect(() => {
    setSelectedRarity("all");

    if (!selectedSet) {
      setAvailableRarities([]);
      setRaritiesLoading(false);
      return;
    }

    let isCurrentRequest = true;
    setRaritiesLoading(true);

    pokemonCardService
      .getSetRarities(selectedSet.id)
      .then((rarities) => {
        if (!isCurrentRequest) return;

        const uniqueRarities = [...new Set(rarities.filter(Boolean))].sort(
          (left, right) => left.localeCompare(right, locale),
        );
        setAvailableRarities(uniqueRarities);
      })
      .catch((err) => {
        if (!isCurrentRequest) return;
        setAvailableRarities([]);
        console.error("Error fetching Pokemon set rarities:", err);
      })
      .finally(() => {
        if (isCurrentRequest) setRaritiesLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [locale, selectedSet]);

  const fetchCards = useCallback(
    async (
      page: number,
      filters: {
        setId?: string;
        serieId?: string;
        rarity?: string;
        type?: string;
        search?: string;
      } = {},
      append = false,
    ) => {
      try {
        setLoading(true);
        setError(null);

        const params: PokemonCardQueryParams = {
          page,
          limit: itemsPerPage,
        };

        if (filters.setId) params.setId = filters.setId;
        else if (filters.serieId) params.serieId = filters.serieId;

        if (filters.rarity && filters.rarity !== "all")
          params.rarity = filters.rarity;
        if (filters.type && filters.type !== "all") params.type = filters.type;
        if (filters.search && filters.search.trim() !== "")
          params.search = filters.search.trim();

        const data = await pokemonCardService.getPaginated(params);

        if (append) {
          setCards((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const newCards = data.data.filter((c) => !existingIds.has(c.id));
            return [...prev, ...newCards];
          });
        } else {
          setCards(data.data);
        }

        setHasMore(data.meta.hasNextPage);
        setTotalItems(data.meta.totalItems);
      } catch (err) {
        setError(t("cardsError"));
        console.error("Error fetching Pokemon cards:", err);
      } finally {
        setLoading(false);
      }
    },
    [itemsPerPage],
  );

  useEffect(() => {
    if (!selectedSet && !activeSearch.trim()) {
      setCards([]);
      setHasMore(false);
      setTotalItems(0);
      setLoading(false);
      return;
    }

    setCurrentPage(1);
    fetchCards(
      1,
      {
        setId: selectedSet?.id,
        serieId: selectedSerie?.id,
        rarity: selectedRarity,
        type: selectedType,
        search: activeSearch || undefined,
      },
      false,
    );
  }, [
    selectedSet,
    selectedSerie,
    selectedRarity,
    selectedType,
    activeSearch,
    fetchCards,
  ]);

  useEffect(() => {
    if (currentPage > 1) {
      fetchCards(
        currentPage,
        {
          setId: selectedSet?.id,
          serieId: selectedSerie?.id,
          rarity: selectedRarity,
          type: selectedType,
          search: activeSearch || undefined,
        },
        true,
      );
    }
  }, [
    currentPage,
    selectedSet,
    selectedSerie,
    selectedRarity,
    selectedType,
    activeSearch,
    fetchCards,
  ]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting && hasMore && !loading) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading]);

  const handleSearch = useCallback((query: string) => {
    setActiveSearch(query);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setActiveSearch("");
  }, []);

  const resetFilters = () => {
    setSelectedType("all");
    setSelectedRarity("all");
    setSelectedSet(null);
    setSelectedSerie(null);
    clearSearch();
  };

  const filteredSets = useMemo(() => {
    if (!selectedSerie) return sets;
    return sets.filter((set) => set.serie?.id === selectedSerie.id);
  }, [selectedSerie, sets]);

  const currentData = useMemo(() => {
    if (!selectedSet && !activeSearch.trim()) return null;
    return {
      data: cards,
      meta: {
        totalItems,
        currentPage,
        totalPages: Math.ceil(totalItems / itemsPerPage),
        hasNextPage: hasMore,
      },
    };
  }, [
    cards,
    totalItems,
    currentPage,
    itemsPerPage,
    hasMore,
    selectedSet,
    activeSearch,
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handleSerieSelect = (serie: PokemonSerieType) => {
    setSelectedSerie(serie);
    setSelectedSet(null);
    setCurrentPage(1);
  };

  const handleSetSelect = (set: PokemonSetType) => {
    setSelectedSet(set);
    setSelectedRarity("all");

    if (!selectedSerie && set.serie) {
      setSelectedSerie(set.serie);
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <CardHeader className="gap-0 border-b border-border px-5 py-5 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("catalogLabel")}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("pokemonCards")}
              </h1>
              <CardDescription className="mt-1">
                {t("explorerSubtitle")}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="text-xs"
              >
                {t("reset")}
              </Button>
              <div className="flex rounded-md border border-border bg-muted/60 p-0.5">
                <Button
                  variant={displayFormat === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setDisplayFormat("grid")}
                  className="h-8 rounded px-2.5 text-xs"
                >
                  <GridIcon className="w-3.5 h-3.5 mr-1" />
                  {t("gridView")}
                </Button>
                <Button
                  variant={displayFormat === "table" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setDisplayFormat("table")}
                  className="h-8 rounded px-2.5 text-xs"
                >
                  <ListIcon className="w-3.5 h-3.5 mr-1" />
                  {t("tableView")}
                </Button>
              </div>
            </div>
          </div>

          <nav
            aria-label={t("breadcrumbLabel")}
            className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border pt-4 text-sm text-muted-foreground"
          >
            <button
              type="button"
              onClick={() => {
                setSelectedSerie(null);
                setSelectedSet(null);
                setCurrentPage(1);
              }}
              className="font-medium transition-colors hover:text-foreground"
            >
              {t("title")}
            </button>
            {selectedSerie && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSet(null);
                    setCurrentPage(1);
                  }}
                  className="font-medium text-foreground transition-colors hover:text-primary"
                >
                  {selectedSerie.name}
                </button>
              </>
            )}
            {selectedSet && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                <span className="font-semibold text-foreground">
                  {selectedSet.name}
                </span>
              </>
            )}
          </nav>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {!selectedSerie && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Layers className="h-4 w-4 text-muted-foreground" />
                {t("seriesHeading", { count: series.length })}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {series.map((serie) => (
                  <button
                    type="button"
                    key={serie.id}
                    onClick={() => handleSerieSelect(serie)}
                    className="group relative overflow-hidden rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-foreground/20 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex h-16 items-center justify-center mb-3">
                      {getSeriesLogo(serie) ? (
                        <img
                          src={getSeriesLogo(serie)}
                          alt={serie.name}
                          loading="lazy"
                          decoding="async"
                          className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="text-2xl font-bold opacity-30 select-none">
                          POKÉMON
                        </div>
                      )}
                    </div>
                    <div className="text-center text-sm font-medium transition-colors group-hover:text-primary">
                      {serie.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedSerie && !selectedSet && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedSerie(null);
                    setCurrentPage(1);
                  }}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  {t("backToSeries")}
                </Button>
              </div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Layers className="h-4 w-4 text-muted-foreground" />
                {t("setsHeading", {
                  series: selectedSerie.name,
                  count: filteredSets.length,
                })}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredSets.map((set) => (
                  <button
                    type="button"
                    key={set.id}
                    onClick={() => handleSetSelect(set)}
                    className="group flex items-center gap-3 overflow-hidden rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-foreground/20 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-background/50 rounded-lg p-1.5 border border-border/20">
                      {getSetSymbol(set) ? (
                        <img
                          src={getSetSymbol(set)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : getSetLogo(set) ? (
                        <img
                          src={getSetLogo(set)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Bookmark className="w-5 h-5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {set.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {set.releaseDate
                            ? new Date(set.releaseDate).toLocaleDateString(
                                locale,
                                { year: "numeric", month: "short" },
                              )
                            : "N/A"}
                        </span>
                        <span>•</span>
                        <span>{set.cardCount?.total ?? 0} cartes</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {set.legal?.standard && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 bg-green-500/10 text-green-500 border border-green-500/20"
                          >
                            Std
                          </Badge>
                        )}
                        {set.legal?.expanded && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          >
                            Exp
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedSet && (
            <section className="flex flex-col items-center gap-6 rounded-lg border border-border bg-muted/25 p-5 sm:flex-row sm:p-6">
              <div className="flex h-28 w-40 flex-shrink-0 items-center justify-center rounded-lg bg-background p-4 shadow-sm ring-1 ring-border">
                {getSetLogo(selectedSet) ? (
                  <img
                    src={getSetLogo(selectedSet)}
                    alt={selectedSet.name}
                    loading="lazy"
                    decoding="async"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : getSetSymbol(selectedSet) ? (
                  <img
                    src={getSetSymbol(selectedSet)}
                    alt={selectedSet.name}
                    loading="lazy"
                    decoding="async"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Bookmark className="w-10 h-10 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {selectedSet.name}
                  </h2>
                  <div className="flex gap-1">
                    {selectedSet.legal?.standard && (
                      <Badge className="bg-green-500/15 text-green-500 border border-green-500/30 text-xs">
                        Standard
                      </Badge>
                    )}
                    {selectedSet.legal?.expanded && (
                      <Badge className="bg-blue-500/15 text-blue-500 border border-blue-500/30 text-xs">
                        Expanded
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Série :{" "}
                  <span className="font-semibold text-foreground">
                    {selectedSerie?.name || selectedSet.serie?.name}
                  </span>{" "}
                  • Sortie le{" "}
                  {selectedSet.releaseDate
                    ? new Date(selectedSet.releaseDate).toLocaleDateString(
                        locale,
                        { day: "numeric", month: "long", year: "numeric" },
                      )
                    : "N/A"}{" "}
                  • Nombre de cartes :{" "}
                  <span className="font-semibold text-foreground">
                    {selectedSet.cardCount?.total}
                  </span>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSet(null);
                  setCurrentPage(1);
                }}
                className="text-xs"
              >
                Changer d&apos;extension
              </Button>
            </section>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="flex items-baseline gap-2 text-xl font-semibold tracking-tight">
                {currentData
                  ? t("cardsHeading", { count: currentData.meta.totalItems })
                  : t("pokemonCards")}
                {activeSearch.trim() && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {t("resultsFor", { query: activeSearch })}
                  </span>
                )}
              </CardTitle>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full sm:w-[160px]">
                <Select
                  value={selectedType}
                  onValueChange={(val) => {
                    setSelectedType(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 bg-background text-sm">
                    <SelectValue placeholder={t("filterByType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allTypes")}</SelectItem>
                    {POKEMON_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <form
                onSubmit={handleSearchSubmit}
                className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-[320px]"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t("searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 bg-background pl-9 text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      aria-label={t("clearSearch")}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button type="submit" size="sm" className="h-10">
                  {t("search")}
                </Button>
                {activeSearch.trim() !== "" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSearch}
                    className="h-10"
                  >
                    {t("clear")}
                  </Button>
                )}
              </form>
            </div>
          </div>

          {selectedSet && (
            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                {t("raritiesInSet")}
              </div>
              <div
                aria-label={t("filterByRarity")}
                className="flex flex-wrap gap-2"
                role="group"
              >
                <Button
                  aria-pressed={selectedRarity === "all"}
                  className="h-9 rounded-full px-4 text-xs"
                  onClick={() => {
                    setSelectedRarity("all");
                    setCurrentPage(1);
                  }}
                  size="sm"
                  variant={selectedRarity === "all" ? "default" : "outline"}
                >
                  {selectedRarity === "all" && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {t("allRarities")}
                </Button>

                {raritiesLoading
                  ? Array.from({ length: 4 }, (_, index) => (
                      <div
                        aria-hidden="true"
                        className="h-9 w-24 animate-pulse rounded-full bg-muted"
                        key={index}
                      />
                    ))
                  : availableRarities.map((rarity) => (
                      <Button
                        aria-pressed={selectedRarity === rarity}
                        className="h-9 rounded-full px-4 text-xs"
                        key={rarity}
                        onClick={() => {
                          setSelectedRarity(rarity);
                          setCurrentPage(1);
                        }}
                        size="sm"
                        variant={
                          selectedRarity === rarity ? "default" : "outline"
                        }
                      >
                        <RarityIcon rarity={rarity} />
                        {rarity}
                      </Button>
                    ))}
              </div>
              {!raritiesLoading && availableRarities.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("noRarities")}
                </p>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {loading && cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-24 gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <div className="text-sm text-muted-foreground font-medium">
                Chargement...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-12 bg-destructive/10 border border-destructive/20 rounded-xl">
              <div className="text-sm text-destructive font-semibold">
                {error}
              </div>
            </div>
          ) : !selectedSet && !activeSearch.trim() ? (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4 text-primary">
                <Layers className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-lg mb-1">{t("readyToExplore")}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                {t("selectSet")}
              </p>
            </div>
          ) : !currentData || currentData.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Search className="w-8 h-8 text-muted-foreground/60" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                {t("noResultsTitle")}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                {t("noResultsDescription")}
              </p>
              <Button onClick={resetFilters} size="sm">
                {t("resetFilters")}
              </Button>
            </div>
          ) : displayFormat === "grid" ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {currentData.data.map((card) => (
                <Link
                  href={`/marketplace/cards/${card.id}`}
                  key={card.id}
                  className="group flex h-full flex-col rounded-lg border border-transparent bg-background p-2 transition-colors hover:border-border hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="relative mb-3 aspect-[3/4] w-full overflow-hidden rounded-md bg-muted/40">
                    <SmartImage
                      src={getCardImage(card, "low")}
                      fallbackSrc="/images/carte-pokemon-dos.jpg"
                      alt={card.name || "Pokemon Card"}
                      className="h-full w-full object-contain transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                        {card.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        {card.set && getSetSymbol(card.set) && (
                          <img
                            src={getSetSymbol(card.set)}
                            alt=""
                            className="w-3.5 h-3.5 object-contain flex-shrink-0"
                            loading="lazy"
                          />
                        )}
                        <span
                          className="truncate flex-grow"
                          title={card.set?.name}
                        >
                          {card.set?.name}
                        </span>
                        <span className="font-semibold text-foreground whitespace-nowrap">
                          #{card.localId}
                        </span>
                      </div>
                    </div>

                    {card.rarity && (
                      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                        <Badge
                          variant="outline"
                          className="gap-1.5 bg-muted/40 py-0.5 pl-1 pr-2 text-[10px] font-medium text-muted-foreground"
                        >
                          <RarityIcon rarity={card.rarity} />
                          {card.rarity}
                        </Badge>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-xl border border-border/40 overflow-hidden bg-muted/10">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/40">
                    <TableHead className="w-[80px]">{t("image")}</TableHead>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("set")}</TableHead>
                    <TableHead>{t("number")}</TableHead>
                    <TableHead>{t("rarity")}</TableHead>
                    <TableHead className="text-right">HP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.data.map((card) => (
                    <TableRow
                      key={card.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="py-2">
                        <Link href={`/marketplace/cards/${card.id}`}>
                          <Image
                            src={getCardImage(card, "low")}
                            alt={card.name || "Pokemon Card"}
                            width={44}
                            height={60}
                            className="object-cover rounded hover:scale-105 transition-transform duration-200"
                          />
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground py-2">
                        <Link
                          href={`/marketplace/cards/${card.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {card.name || "N/A"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground py-2">
                        {card.set?.name || "N/A"}
                      </TableCell>
                      <TableCell className="font-mono text-sm py-2">
                        #{card.localId || "N/A"}
                      </TableCell>
                      <TableCell className="py-2">
                        {card.rarity ? (
                          <Badge
                            variant="outline"
                            className="gap-1.5 bg-muted/50 py-0.5 pl-1 pr-2 text-[10px] font-normal"
                          >
                            <RarityIcon rarity={card.rarity} />
                            {card.rarity}
                          </Badge>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-red-500 py-2">
                        {card.hp ? `${card.hp} HP` : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div
            ref={observerRef}
            className="h-10 w-full flex items-center justify-center mt-6"
          >
            {loading && cards.length > 0 && (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
