import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterState } from "@/hooks/useMarketplace";
import { PokemonSerieType, PokemonSetType } from "@/types/cardPokemon";
import { cardStates, currencyOptions, languages } from "@/utils/variables";

import { Search, SlidersHorizontal, X } from "lucide-react";
import React from "react";

type MarketplaceSearchProps = {
  filters: FilterState;
  activeFiltersCount: number;
  showFilters: boolean;
  setShowFilters: (showFilters: boolean) => void;
  resetFilters: () => void;
  setFilters: (filters: Partial<FilterState>) => void;
  series: PokemonSerieType[];
  sets: PokemonSetType[];
  updateFilters: (filters: Partial<FilterState>) => void;
};

const MarketplaceSearch = ({
  filters,
  activeFiltersCount,
  showFilters,
  setShowFilters,
  resetFilters,
  setFilters,
  series,
  sets,
  updateFilters,
}: MarketplaceSearchProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Recherche et filtres
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} actif(s)</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {showFilters ? "Masquer" : "Filtres"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Rechercher une carte..."
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="w-full"
            />
          </div>
          <Select
            value={filters.sortBy}
            onValueChange={(value) => updateFilters({ sortBy: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nom</SelectItem>
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
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ASC">Croissant</SelectItem>
              <SelectItem value="DESC">Décroissant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <Label>Série</Label>
              <Select
                value={filters.serieId || "all"}
                onValueChange={(value) =>
                  updateFilters({
                    serieId: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les séries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les séries</SelectItem>
                  {series?.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={s.id.toString()}
                    >
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Extension</Label>
              <Select
                value={filters.setId || "all"}
                onValueChange={(value) =>
                  updateFilters({
                    setId: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les extensions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les extensions</SelectItem>
                  {sets?.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={s.id}
                    >
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rareté</Label>
              <Input
                placeholder="Ex: Rare Holo"
                value={filters.rarity || ""}
                onChange={(e) =>
                  updateFilters({ rarity: e.target.value || undefined })
                }
              />
            </div>

            <div>
              <Label>État</Label>
              <Select
                value={filters.cardState || "all"}
                onValueChange={(value) =>
                  updateFilters({
                    cardState: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les états" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les états</SelectItem>
                  {cardStates.map((cs) => (
                    <SelectItem
                      key={cs.value}
                      value={cs.value}
                    >
                      {cs.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Devise</Label>
              <Select
                value={filters.currency || "all"}
                onValueChange={(value) =>
                  updateFilters({
                    currency: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les devises" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les devises</SelectItem>
                  {currencyOptions.map((c) => (
                    <SelectItem
                      key={c.value}
                      value={c.value}
                    >
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Langue</Label>
              <Select
                value={filters.language || "all"}
                onValueChange={(value) =>
                  updateFilters({
                    language: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les langues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les langues</SelectItem>
                  {languages.map((l) => (
                    <SelectItem
                      key={l.value}
                      value={l.value}
                    >
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prix min (€)</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.priceMin || ""}
                onChange={(e) =>
                  updateFilters({
                    priceMin: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>

            <div>
              <Label>Prix max (€)</Label>
              <Input
                type="number"
                placeholder="9999"
                value={filters.priceMax || ""}
                onChange={(e) =>
                  updateFilters({
                    priceMax: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>

            {activeFiltersCount > 0 && (
              <div className="col-span-full">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                >
                  <X className="w-4 h-4 mr-2" />
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketplaceSearch;
