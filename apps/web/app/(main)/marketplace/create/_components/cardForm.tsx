"use client";

import { Button } from "@components/ui/button";
import { authedFetch } from "@utils/fetch";
import React, { useEffect, useMemo, useState } from "react";
import * as z from "zod";
import { Form } from "@components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { Label } from "@components/ui/label";
import { Input } from "@components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  Filter,
  Loader2,
  RefreshCcw,
  Search,
  Tag,
  Layers,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { FormSchema } from "../utils";
import { cardStates, currencyOptions } from "@/utils/variables";
import { Currency } from "@/utils/enums";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { FilterState, useMarketplaceCards } from "@/hooks/useMarketplace";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { Separator } from "@components/ui/separator";
import { PokemonCardType, PokemonSerieType, PokemonSetType } from "@/types/cardPokemon";
import Image from "next/image";
import { PaginatedNav } from "@/components/Shared/PaginatedNav";
import { Textarea } from "@/components/ui/textarea";

const CardForm = () => {
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [selectedCard, setSelectedCard] = useState<PokemonCardType | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    sortBy: "localId",
    sortOrder: "DESC",
  });

  const filtersWithSearch = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const {
    data,
    sets,
    series,
    isLoading: cardsLoading,
  } = useMarketplaceCards(filtersWithSearch, page, 12);

  const allCards = data?.data || [];
  const meta = data?.meta;

  type FormValues = z.infer<typeof FormSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      cardId: undefined as unknown as string,
      price: 0,
      quantityAvailable: 1,
      cardState: "NM",
      description: "",
      currency: Currency.EUR,
    },
  });

  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [filtersWithSearch]);

  const activeFiltersCount =
    (filters.search ? 1 : 0) +
    (filters.setId ? 1 : 0) +
    (filters.serieId ? 1 : 0) +
    (filters.rarity ? 1 : 0);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const handleSelectCard = (card: PokemonCardType) => {
    setSelectedCard(card);
    form.setValue("cardId", card.id, { shouldValidate: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Vérification de l'authentification...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          Vous devez être connecté pour créer une vente.
        </p>
        <Link href="/auth/login">
          <Button>Se connecter</Button>
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: FormValues) => {
    if (!user?.id) {
      toast.error("Erreur d'authentification. Veuillez vous reconnecter.");
      return;
    }

    setLoading(true);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    const isoDate = expiresAt.toISOString();

    const creationData = {
      pokemonCardId: data.cardId,
      price: data.price,
      currency: data.currency,
      description: data.description || "",
      quantityAvailable: data.quantityAvailable,
      cardState: data.cardState,
      expiresAt: isoDate,
    };

    try {
      const result = await authedFetch("POST", "/listings", {
        data: creationData,
      });

      if (result && typeof result === "object" && "id" in result) {
        form.reset();
        setSelectedCard(null);
        toast.success("La vente a été créée avec succès !");
        // Use the pokemonCardId (UUID) for the redirect, not the listing id
        router.push(`/marketplace/cards/${data.cardId}`);
      } else {
        toast.error("Une erreur est survenue lors de la création de la vente.");
      }
    } catch (error: any) {
      console.error("Erreur création vente:", error);

      if (error.response?.status === 401) {
        toast.error("Session expirée. Veuillez vous reconnecter.");
        router.push("/auth/login");
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Une erreur est survenue lors de la création de la vente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Selected Card Preview */}
        {selectedCard && (
          <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 via-background to-secondary/10 shadow-lg overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Carte sélectionnée</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="relative w-24 h-32 rounded-lg overflow-hidden border-2 border-primary/30 shadow-md flex-shrink-0">
                  {selectedCard.image ? (
                    <Image
                      src={`${selectedCard.image}/low.png`}
                      alt={selectedCard.name || "Carte"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Layers className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-bold text-xl">{selectedCard.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCard.set?.name && (
                      <Badge variant="secondary">{selectedCard.set.name}</Badge>
                    )}
                    {selectedCard.rarity && (
                      <Badge variant="outline">{selectedCard.rarity}</Badge>
                    )}
                    {selectedCard.localId && (
                      <Badge variant="outline">#{selectedCard.localId}</Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCard(null);
                      form.setValue("cardId", undefined as unknown as string);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    Changer de carte
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card Selection */}
        {!selectedCard && (
          <Card className="border border-border/60 shadow-lg">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-primary" />
                    Sélection de la carte
                  </CardTitle>
                  <CardDescription>
                    Utilisez les filtres pour trouver précisément votre carte.
                  </CardDescription>
                </div>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="animate-pulse">
                    {activeFiltersCount} filtre{activeFiltersCount > 1 ? "s" : ""} actif
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search & Sort */}
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex-1">
                  <Label className="sr-only">Rechercher</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      placeholder="Nom, numéro, extension..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-9 h-11"
                    />
                  </div>
                </div>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => updateFilters({ sortBy: value })}
                >
                  <SelectTrigger className="w-full lg:w-48 h-11">
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
                  <SelectTrigger className="w-full lg:w-40 h-11">
                    <SelectValue placeholder="Ordre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASC">Croissant</SelectItem>
                    <SelectItem value="DESC">Décroissant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <FilterSelect
                  label="Série"
                  placeholder="Toutes les séries"
                  value={filters.serieId || "all"}
                  onChange={(value) =>
                    updateFilters({
                      serieId: value === "all" ? undefined : value,
                    })
                  }
                  options={(series as PokemonSerieType[] | undefined)?.map((s) => ({
                    value: s.id.toString(),
                    label: s.name,
                  }))}
                />

                <FilterSelect
                  label="Extension"
                  placeholder="Toutes les extensions"
                  value={filters.setId || "all"}
                  onChange={(value) =>
                    updateFilters({
                      setId: value === "all" ? undefined : value,
                    })
                  }
                  options={(sets as PokemonSetType[] | undefined)?.map((s) => ({
                    value: s.id.toString(),
                    label: s.name,
                  }))}
                />

                <div className="space-y-1.5">
                  <Label>Rareté</Label>
                  <Input
                    placeholder="Ex: Rare Holo"
                    value={filters.rarity || ""}
                    onChange={(e) =>
                      updateFilters({
                        rarity: e.target.value || undefined,
                      })
                    }
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="invisible">Actions</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
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
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Réinitialiser
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Card Grid */}
              {cardsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-64 rounded-lg bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : allCards.length ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {allCards.map((item: any) => {
                      const card = (item.card || item) as PokemonCardType;
                      return (
                        <article
                          key={card.id}
                          onClick={() => handleSelectCard(card)}
                          className="relative rounded-xl border bg-card shadow-sm hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer flex flex-col overflow-hidden group"
                        >
                          <div className="relative aspect-[3/4] bg-muted/40">
                            {card.image ? (
                              <Image
                                src={`${card.image}/low.png`}
                                alt={card.name || "Carte"}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <Layers className="w-6 h-6" />
                              </div>
                            )}
                            {card.rarity && (
                              <Badge className="absolute top-2 left-2 backdrop-blur-sm text-xs">
                                {card.rarity}
                              </Badge>
                            )}
                            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Badge className="bg-primary text-primary-foreground">
                                Sélectionner
                              </Badge>
                            </div>
                          </div>
                          <div className="p-3 space-y-1">
                            <h3 className="font-semibold line-clamp-1 text-sm">
                              {card.name || "Carte"}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {card.set?.name}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {meta && (
                    <PaginatedNav meta={meta} page={page} onPageChange={setPage} />
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-muted-foreground">
                  <AlertCircle className="w-5 h-5" />
                  Aucune carte ne correspond à ces critères.
                </div>
              )}

              {form.formState.errors.cardId && (
                <p className="text-sm text-destructive font-medium">
                  {form.formState.errors.cardId.message}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sale Details */}
        <Card className="border border-primary/20 shadow-lg bg-gradient-to-br from-secondary/5 via-background to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Détails de la vente
            </CardTitle>
            <CardDescription>
              Définissez le prix, l'état et la quantité de votre carte.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="h-11 pl-8"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.valueAsNumber || 0)
                          }
                        />
                        <span className="absolute left-3 top-3 text-muted-foreground">€</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Devise</FormLabel>
                    <Select
                      value={field.value || Currency.EUR}
                      onValueChange={(value) => {
                        field.onChange(value as Currency);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Choisissez une devise" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="quantityAvailable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de cartes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        className="h-11"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber || 1)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cardState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>État de la carte</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Choisissez un état">
                            {field.value
                              ? cardStates.find((s) => s.value === field.value)?.label
                              : "Choisissez un état"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cardStates.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez l'état de la carte, ses particularités..."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" asChild>
            <Link href="/marketplace">Annuler</Link>
          </Button>
          <Button disabled={loading || !selectedCard} type="submit" className="min-w-[140px]">
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Créer la vente
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

// Filter Select Component
type FilterSelectProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options?: { value: string; label: string }[];
};

const FilterSelect = ({
  label,
  placeholder,
  value,
  onChange,
  options = [],
}: FilterSelectProps) => {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CardForm;
