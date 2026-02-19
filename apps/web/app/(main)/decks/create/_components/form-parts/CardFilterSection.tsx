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
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
} from "lucide-react";
import { FilterState } from "@/hooks/useMarketplace";
import { PokemonSerieType, PokemonSetType } from "@/types/cardPokemon";

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
}) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Select
      value={value}
      onValueChange={onChange}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tout afficher</SelectItem>
        {options?.map((opt) => (
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
);

interface CardFilterSectionProps {
  searchInput: string;
  setSearchInput: (val: string) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  activeFiltersCount: number;
  series: PokemonSerieType[] | undefined;
  sets: PokemonSetType[] | undefined;
  setPage: (page: number) => void;
  children?: React.ReactNode;
}

export const CardFilterSection: React.FC<CardFilterSectionProps> = ({
  searchInput,
  setSearchInput,
  filters,
  setFilters,
  activeFiltersCount,
  series,
  sets,
  setPage,
  children,
}) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  return (
    <Card className="xl:col-span-2 border border-border/60 shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Sélection des cartes
            </CardTitle>
            <CardDescription>
              Retrouvez les filtres avancés du marketplace pour composer votre
              liste.
            </CardDescription>
          </div>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">
              {activeFiltersCount} filtre
              {activeFiltersCount > 1 ? "s" : ""} actif
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1">
              <Label className="sr-only">Rechercher</Label>
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  placeholder="Nom, numéro, extension..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select
                value={filters.sortBy}
                onValueChange={(value) => updateFilters({ sortBy: value })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nom</SelectItem>
                  <SelectItem value="localId">Numéro</SelectItem>
                  <SelectItem value="price">Prix</SelectItem>
                  <SelectItem value="popularity">Popularité</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.sortOrder}
                onValueChange={(value) =>
                  updateFilters({ sortOrder: value as "ASC" | "DESC" })
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Ordre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASC">Croissant</SelectItem>
                  <SelectItem value="DESC">Décroissant</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className="px-3"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtres
                {isFiltersOpen ? (
                  <ChevronUp className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-2" />
                )}
              </Button>
            </div>
          </div>

          {isFiltersOpen && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
              <FilterSelect
                label="Série"
                placeholder="Toutes"
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
                label="Extension"
                placeholder="Toutes"
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
                label="Énergie"
                placeholder="Tous"
                value={filters.energyType || "all"}
                onChange={(value) =>
                  updateFilters({
                    energyType: value === "all" ? undefined : value,
                  })
                }
                options={[
                  { value: "Grass", label: "Plante" },
                  { value: "Fire", label: "Feu" },
                  { value: "Water", label: "Eau" },
                  { value: "Lightning", label: "Électrique" },
                  { value: "Psychic", label: "Psy" },
                  { value: "Fighting", label: "Combat" },
                  { value: "Darkness", label: "Ténèbres" },
                  { value: "Metal", label: "Métal" },
                  { value: "Fairy", label: "Fée" },
                  { value: "Dragon", label: "Dragon" },
                  { value: "Colorless", label: "Incolore" },
                ]}
              />

              <div className="space-y-1.5">
                <Label>Rareté</Label>
                <Input
                  placeholder="Ex: Rare"
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
                  <Label>Prix (€)</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder="Min"
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
                      placeholder="Max"
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
                  Réinitialiser tous les filtres
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
