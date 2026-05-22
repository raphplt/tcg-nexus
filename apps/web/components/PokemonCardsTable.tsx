"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCardImage } from "@/utils/images";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type {
  PokemonCardType,
  PokemonSerieType,
  PokemonSetType,
} from "@/types/cardPokemon";
import type { PaginatedResult } from "@/types/pagination";
import {
  Layers,
  Grid as GridIcon,
  List as ListIcon,
  Search,
  X,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Sparkles,
  Bookmark,
} from "lucide-react";

interface PokemonCardsTableProps {
  initialPage?: number;
  itemsPerPage?: number;
}

const POKEMON_TYPES = [
  { value: "Grass", label: "Plante" },
  { value: "Fire", label: "Feu" },
  { value: "Water", label: "Eau" },
  { value: "Lightning", label: "Électrique" },
  { value: "Psychic", label: "Psy" },
  { value: "Fighting", label: "Combat" },
  { value: "Darkness", label: "Obscurité" },
  { value: "Metal", label: "Métal" },
  { value: "Dragon", label: "Dragon" },
  { value: "Fairy", label: "Fée" },
  { value: "Colorless", label: "Incolore" },
];

const POKEMON_RARITIES = [
  { value: "Commune", label: "Commune" },
  { value: "Peu Commune", label: "Peu Commune" },
  { value: "Rare", label: "Rare" },
  { value: "Rare Holo", label: "Rare Holo" },
  { value: "Double rare", label: "Double Rare" },
  { value: "Ultra Rare", label: "Ultra Rare" },
  { value: "Illustration rare", label: "Illustration Rare" },
  { value: "Illustration spéciale rare", label: "Illustration Spéciale Rare" },
  { value: "Hyper rare", label: "Hyper Rare" },
  { value: "Secret Rare", label: "Secret Rare" },
  { value: "Promo", label: "Promo" },
];

export function PokemonCardsTable({
  initialPage = 1,
  itemsPerPage = 10,
}: PokemonCardsTableProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [paginatedData, setPaginatedData] =
    useState<PaginatedResult<PokemonCardType> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PokemonCardType[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Series and Sets states
  const [series, setSeries] = useState<PokemonSerieType[]>([]);
  const [sets, setSets] = useState<PokemonSetType[]>([]);
  const [selectedSerie, setSelectedSerie] = useState<PokemonSerieType | null>(
    null,
  );
  const [selectedSet, setSelectedSet] = useState<PokemonSetType | null>(null);

  // Custom Filters
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [displayFormat, setDisplayFormat] = useState<"grid" | "table">("grid");

  // Load series & sets on mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [allSeries, allSets] = await Promise.all([
          pokemonCardService.getAllSeries(),
          pokemonCardService.getAllSets(),
        ]);
        setSeries(allSeries);
        // Sort sets by release date descending
        const sortedSets = [...allSets].sort((a, b) => {
          const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return dateB - dateA;
        });
        setSets(sortedSets);
      } catch (err) {
        console.error(
          "Erreur lors du chargement des métadonnées (séries/sets):",
          err,
        );
      }
    };
    loadMetadata();
  }, []);

  const fetchCards = useCallback(
    async (
      page: number,
      filters: {
        setId?: string;
        serieId?: string;
        rarity?: string;
        type?: string;
      } = {},
    ) => {
      try {
        setLoading(true);
        setError(null);

        const params: any = {
          page,
          limit: itemsPerPage,
        };

        if (filters.setId) params.setId = filters.setId;
        else if (filters.serieId) params.serieId = filters.serieId;

        if (filters.rarity && filters.rarity !== "all")
          params.rarity = filters.rarity;
        if (filters.type && filters.type !== "all") params.type = filters.type;

        const data = await pokemonCardService.getPaginated(params);
        setPaginatedData(data);
      } catch (err) {
        setError("Erreur lors du chargement des cartes Pokemon");
        console.error("Error fetching Pokemon cards:", err);
      } finally {
        setLoading(false);
      }
    },
    [itemsPerPage],
  );

  // Effet pour recharger les cartes lors du changement de page ou de filtres
  useEffect(() => {
    if (!isSearching) {
      fetchCards(currentPage, {
        setId: selectedSet?.id,
        serieId: selectedSerie?.id,
        rarity: selectedRarity,
        type: selectedType,
      });
    }
  }, [
    currentPage,
    fetchCards,
    isSearching,
    selectedSet,
    selectedSerie,
    selectedRarity,
    selectedType,
  ]);

  // Fonction pour effectuer une recherche
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);

      if (!query.trim()) {
        setIsSearching(false);
        setSearchResults([]);
        setCurrentPage(1);
        fetchCards(1, {
          setId: selectedSet?.id,
          serieId: selectedSerie?.id,
          rarity: selectedRarity,
          type: selectedType,
        });
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setIsSearching(true);
        const results = await pokemonCardService.search(query);
        setSearchResults(results);
        setCurrentPage(1);
      } catch (err) {
        setError("Erreur lors de la recherche");
        console.error("Error searching Pokemon cards:", err);
      } finally {
        setLoading(false);
      }
    },
    [fetchCards, selectedSet, selectedSerie, selectedRarity, selectedType],
  );

  // Fonction pour nettoyer la recherche
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setIsSearching(false);
    setSearchResults([]);
    setCurrentPage(1);
    fetchCards(1, {
      setId: selectedSet?.id,
      serieId: selectedSerie?.id,
      rarity: selectedRarity,
      type: selectedType,
    });
  }, [fetchCards, selectedSet, selectedSerie, selectedRarity, selectedType]);

  // Reset filters
  const resetFilters = () => {
    setSelectedType("all");
    setSelectedRarity("all");
    setSelectedSet(null);
    setSelectedSerie(null);
    clearSearch();
  };

  // Filter sets according to selected series
  const filteredSets = useMemo(() => {
    if (!selectedSerie) return sets;
    return sets.filter((set) => set.serie?.id === selectedSerie.id);
  }, [selectedSerie, sets]);

  // Pagination des résultats de recherche
  const paginatedSearchResults = useMemo(() => {
    if (!isSearching || searchResults.length === 0) return null;

    const filtered = searchResults.filter((card) => {
      // Type filter
      if (
        selectedType !== "all" &&
        (!card.types || !card.types.includes(selectedType))
      ) {
        return false;
      }
      // Rarity filter
      if (selectedRarity !== "all" && card.rarity !== selectedRarity) {
        return false;
      }
      // Set filter
      if (selectedSet && card.set?.id !== selectedSet.id) {
        return false;
      }
      // Serie filter
      if (selectedSerie && card.set?.serie?.id !== selectedSerie.id) {
        return false;
      }
      return true;
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filtered.slice(startIndex, endIndex);

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      data: paginatedItems,
      meta: {
        totalItems,
        itemCount: paginatedItems.length,
        itemsPerPage,
        totalPages,
        currentPage,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    };
  }, [
    isSearching,
    searchResults,
    currentPage,
    itemsPerPage,
    selectedType,
    selectedRarity,
    selectedSet,
    selectedSerie,
  ]);

  // Détermine quelles données utiliser (recherche ou pagination normale)
  const currentData = isSearching ? paginatedSearchResults : paginatedData;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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
    // Find matching serie if not set yet
    if (!selectedSerie && set.serie) {
      setSelectedSerie(set.serie);
    }
    setCurrentPage(1);
  };

  const renderPaginationItems = () => {
    if (!currentData) return null;

    const { totalPages, currentPage: current } = currentData.meta;
    const items = [];

    if (currentData.meta.hasPreviousPage) {
      items.push(
        <PaginationItem key="previous">
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(current - 1);
            }}
          />
        </PaginationItem>,
      );
    }

    const startPage = Math.max(1, current - 2);
    const endPage = Math.min(totalPages, current + 2);

    if (startPage > 1) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(1);
            }}
          >
            1
          </PaginationLink>
        </PaginationItem>,
      );
      if (startPage > 2) {
        items.push(<PaginationEllipsis key="ellipsis1" />);
      }
    }

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <PaginationItem key={page}>
          <PaginationLink
            href="#"
            isActive={page === current}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(page);
            }}
          >
            {page}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<PaginationEllipsis key="ellipsis2" />);
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(totalPages);
            }}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (currentData.meta.hasNextPage) {
      items.push(
        <PaginationItem key="next">
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(current + 1);
            }}
          />
        </PaginationItem>,
      );
    }

    return items;
  };

  return (
    <div className="space-y-8">
      {/* 1. Exploration Panel (Séries et Extensions) */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-md overflow-hidden shadow-2xl">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                Explorateur Pokédex
              </CardTitle>
              <CardDescription>
                Naviguez par séries et extensions de cartes officielles
              </CardDescription>
            </div>

            {/* View Mode Toggle & Reset */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="text-xs hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                Réinitialiser
              </Button>
              <div className="flex bg-muted rounded-lg p-0.5 border border-border/40">
                <Button
                  variant={displayFormat === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setDisplayFormat("grid")}
                  className="px-2.5 py-1 h-7 text-xs rounded-md"
                >
                  <GridIcon className="w-3.5 h-3.5 mr-1" />
                  Grille
                </Button>
                <Button
                  variant={displayFormat === "table" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setDisplayFormat("table")}
                  className="px-2.5 py-1 h-7 text-xs rounded-md"
                >
                  <ListIcon className="w-3.5 h-3.5 mr-1" />
                  Tableau
                </Button>
              </div>
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground mt-4 bg-muted/40 p-2 rounded-lg border border-border/20">
            <span
              onClick={() => {
                setSelectedSerie(null);
                setSelectedSet(null);
                setCurrentPage(1);
              }}
              className="cursor-pointer hover:text-primary transition-colors font-medium"
            >
              Pokédex
            </span>
            {selectedSerie && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                <span
                  onClick={() => {
                    setSelectedSet(null);
                    setCurrentPage(1);
                  }}
                  className="cursor-pointer hover:text-primary transition-colors font-medium text-foreground"
                >
                  {selectedSerie.name}
                </span>
              </>
            )}
            {selectedSet && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                <span className="font-semibold text-primary">
                  {selectedSet.name}
                </span>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* A. View Series (when selectedSerie is null) */}
          {!selectedSerie && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" /> Séries Pokémon (
                {series.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {series.map((serie) => (
                  <div
                    key={serie.id}
                    onClick={() => handleSerieSelect(serie)}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-border/40 bg-muted/30 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-muted/60 hover:shadow-lg"
                  >
                    <div className="flex h-16 items-center justify-center mb-3">
                      {serie.logo ? (
                        <img
                          src={serie.logo}
                          alt={serie.name}
                          className="max-h-full max-w-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-2xl font-bold opacity-30 select-none">
                          POKÉMON
                        </div>
                      )}
                    </div>
                    <div className="text-center font-semibold text-sm group-hover:text-primary transition-colors">
                      {serie.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* B. View Sets in selected Serie */}
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
                  Retour aux séries
                </Button>
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" /> Extensions de la
                série {selectedSerie.name} ({filteredSets.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredSets.map((set) => (
                  <div
                    key={set.id}
                    onClick={() => handleSetSelect(set)}
                    className="group flex items-center gap-3 cursor-pointer overflow-hidden rounded-xl border border-border/40 bg-muted/30 p-3 transition-all duration-300 hover:border-primary/50 hover:bg-muted/60 hover:shadow-lg"
                  >
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-background/50 rounded-lg p-1.5 border border-border/20">
                      {set.symbol ? (
                        <img
                          src={set.symbol}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : set.logo ? (
                        <img
                          src={set.logo}
                          alt=""
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
                                "fr-FR",
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* C. View Selected Set Banner */}
          {selectedSet && (
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/20 border border-border/20 rounded-xl p-4">
              <div className="w-20 h-20 flex items-center justify-center bg-background/50 rounded-xl p-2 border border-border/20">
                {selectedSet.logo ? (
                  <img
                    src={selectedSet.logo}
                    alt={selectedSet.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : selectedSet.symbol ? (
                  <img
                    src={selectedSet.symbol}
                    alt={selectedSet.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Bookmark className="w-10 h-10 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h2 className="text-xl font-bold">{selectedSet.name}</h2>
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
                        "fr-FR",
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Cards Display and Filtering Panel */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-2xl">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                {currentData
                  ? `Cartes Pokemon (${currentData.meta.totalItems} cartes)`
                  : "Cartes Pokemon"}
                {isSearching && (
                  <span className="text-sm font-normal text-muted-foreground">
                    - Résultats pour &quot;{searchQuery}&quot;
                  </span>
                )}
              </CardTitle>
              {currentData && (
                <div className="text-xs text-muted-foreground mt-1">
                  Page {currentData.meta.currentPage} sur{" "}
                  {currentData.meta.totalPages}
                </div>
              )}
            </div>

            {/* Filter selectors & Search */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Type Select */}
              <div className="w-[140px]">
                <Select
                  value={selectedType}
                  onValueChange={(val) => {
                    setSelectedType(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Filtrer par type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {POKEMON_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rarity Select */}
              <div className="w-[160px]">
                <Select
                  value={selectedRarity}
                  onValueChange={(val) => {
                    setSelectedRarity(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Filtrer par rareté" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les raretés</SelectItem>
                    {POKEMON_RARITIES.map((rarity) => (
                      <SelectItem key={rarity.value} value={rarity.value}>
                        {rarity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Form */}
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[240px]"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Rechercher une carte..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-2.5 top-2.5 hover:text-foreground text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button type="submit" size="sm" className="h-9 text-xs">
                  Rechercher
                </Button>
                {isSearching && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSearch}
                    className="h-9 text-xs"
                  >
                    Effacer
                  </Button>
                )}
              </form>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {loading ? (
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
          ) : !currentData || currentData.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Search className="w-8 h-8 text-muted-foreground/60" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                Aucune carte trouvée
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                Nous n&apos;avons trouvé aucune carte correspondant à vos
                critères de recherche. Essayez de réinitialiser vos filtres.
              </p>
              <Button onClick={resetFilters} size="sm">
                Réinitialiser les filtres
              </Button>
            </div>
          ) : displayFormat === "grid" ? (
            /* Premium Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {currentData.data.map((card) => (
                <Link
                  href={`/pokemon/${card.id}`}
                  key={card.id}
                  className="group flex flex-col h-full bg-muted/20 border border-border/40 rounded-xl p-3 hover:border-primary/50 hover:bg-muted/40 hover:-translate-y-1.5 transition-all duration-300 shadow-sm hover:shadow-lg"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-black/5 shadow-inner mb-3">
                    <img
                      src={getCardImage(card, "low")}
                      alt={card.name || "Pokemon Card"}
                      className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {card.name}
                      </h4>
                      {card.hp && (
                        <span className="text-[10px] font-extrabold text-red-500 whitespace-nowrap">
                          {card.hp} HP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <span className="truncate">{card.set?.name}</span>
                      <span>•</span>
                      <span className="font-semibold text-foreground whitespace-nowrap">
                        #{card.localId}
                      </span>
                    </div>

                    {/* Types & Rarity */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-border/20">
                      <div className="flex gap-0.5">
                        {card.types?.map((t) => (
                          <Badge
                            key={t}
                            className={`text-[9px] px-1 py-0 font-bold uppercase rounded-sm border-none ${
                              t === "Fire"
                                ? "bg-orange-500 text-white"
                                : t === "Water"
                                  ? "bg-blue-500 text-white"
                                  : t === "Grass"
                                    ? "bg-green-500 text-white"
                                    : t === "Lightning"
                                      ? "bg-yellow-500 text-black"
                                      : t === "Psychic"
                                        ? "bg-purple-500 text-white"
                                        : t === "Fighting"
                                          ? "bg-amber-700 text-white"
                                          : t === "Darkness"
                                            ? "bg-gray-800 text-white border border-gray-700"
                                            : t === "Metal"
                                              ? "bg-slate-400 text-black"
                                              : t === "Dragon"
                                                ? "bg-indigo-600 text-white"
                                                : "bg-gray-400 text-black"
                            }`}
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                      {card.rarity && (
                        <span
                          className="text-[9px] font-medium text-muted-foreground truncate max-w-[80px]"
                          title={card.rarity}
                        >
                          {card.rarity}
                        </span>
                      )}
                    </div>
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
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Set</TableHead>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Rareté</TableHead>
                    <TableHead>Type</TableHead>
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
                        <Link href={`/pokemon/${card.id}`}>
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
                          href={`/pokemon/${card.id}`}
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
                            className="text-[10px] bg-muted/50 font-normal"
                          >
                            {card.rarity}
                          </Badge>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex gap-1">
                          {card.types ? card.types.join(", ") : "N/A"}
                        </div>
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

          {/* Pagination Controls */}
          {currentData && currentData.meta.totalPages > 1 && (
            <div className="mt-8 border-t border-border/20 pt-6">
              <Pagination>
                <PaginationContent>{renderPaginationItems()}</PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
