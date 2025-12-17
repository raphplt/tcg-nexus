"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@components/ui/form";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Switch } from "@components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { Label } from "@components/ui/label";
import { Separator } from "@components/ui/separator";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  Filter,
  Layers,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { decksService } from "@/services/decks.service";
import { DeckFormProps } from "@/types/formDeck";
import {
  PokemonCardType,
  PokemonSerieType,
  PokemonSetType,
} from "@/types/cardPokemon";
import { FormSchema } from "./utils";
import { useDebounce } from "@/hooks/useDebounce";
import { FilterState, useMarketplaceCards } from "@/hooks/useMarketplace";
import MarketplacePagination from "@/app/marketplace/_components/MarketplacePagination";
import { DeckCard } from "@/types/deck-cards";

type DeckFormValues = z.input<typeof FormSchema>;

type AddedCard = {
  id?: number;
  cardId?: string;
  qty: number;
  role: string;
  card?: PokemonCardType;
};

export const DeckForm: React.FC<DeckFormProps> = ({ formats, deck }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cardsMap, setCardsMap] = useState<AddedCard[]>([]);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    sortBy: "localId",
    sortOrder: "DESC",
  });

  const [qtyByCard, setQtyByCard] = useState<Record<string, number>>({});
  const [roleByCard, setRoleByCard] = useState<Record<string, string>>({});

  const filtersWithSearch = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );
  const {
    data,
    sets,
    series,
    isLoading: cardsLoading,
  } = useMarketplaceCards(filtersWithSearch, page, 12);

  const form = useForm<DeckFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      formatId: 0,
      isPublic: false,
      cards: [],
    },
  });

  const errors = form.formState.errors;

  const syncFormCards = React.useCallback(
    (cards: AddedCard[]) => {
      form.setValue(
        "cards",
        cards.map((c) => ({
          cardId: c.cardId ?? "",
          qty: c.qty,
          role: c.role,
        })),
      );
    },
    [form],
  );

  useEffect(() => {
    if (deck) {
      form.reset({
        name: deck.name,
        formatId: deck.format?.id || (formats.length > 0 ? formats[0]?.id : 0),
        isPublic: deck.isPublic,
        cards: [],
      });

      if (deck.cards) {
        const mappedCards: AddedCard[] = deck.cards.map((c: DeckCard) => ({
          id: c.id,
          cardId: c.card?.id,
          qty: c.qty,
          role: c.role,
          card: c.card,
        }));
        setCardsMap(mappedCards);
        syncFormCards(mappedCards);
      }
    } else if (formats.length > 0 && form.getValues("formatId") === 0) {
      form.setValue("formatId", formats[0]?.id || 0);
    }
  }, [deck, formats, form, syncFormCards]);

  const allCards = data?.data || [];
  const meta = data?.meta;

  const activeFiltersCount =
    (filters.search ? 1 : 0) +
    (filters.setId ? 1 : 0) +
    (filters.serieId ? 1 : 0) +
    (filters.energyType ? 1 : 0) +
    (filters.rarity ? 1 : 0) +
    (filters.priceMin !== undefined ? 1 : 0) +
    (filters.priceMax !== undefined ? 1 : 0);

  const mainCount = cardsMap
    .filter((c) => c.role === "main")
    .reduce((acc, c) => acc + c.qty, 0);
  const sideCount = cardsMap
    .filter((c) => c.role === "side")
    .reduce((acc, c) => acc + c.qty, 0);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [filtersWithSearch]);

  const addCard = (card: PokemonCardType, qty: number, role: string) => {
    if (!card.id) return;
    const targetQty = Math.max(1, qty || 1);
    setQtyByCard((prev) => ({ ...prev, [card.id!]: 1 }));
    setCardsMap((prev) => {
      const existing = prev.find(
        (c) => c.cardId === card.id && c.role === role,
      );
      const updated = existing
        ? prev.map((c) =>
            c.cardId === card.id && c.role === role
              ? { ...c, qty: c.qty + targetQty, card }
              : c,
          )
        : [
            ...prev,
            {
              cardId: card.id,
              qty: targetQty,
              role,
              card,
            },
          ];
      syncFormCards(updated);
      return updated;
    });
  };

  const updateCardQty = (cardId: string, role: string, qty: number) => {
    const parsedQty = Math.max(1, qty || 1);
    setCardsMap((prev) => {
      const updated = prev.map((c) =>
        c.cardId === cardId && c.role === role ? { ...c, qty: parsedQty } : c,
      );
      syncFormCards(updated);
      return updated;
    });
  };

  const removeCard = (cardId?: string, role?: string) => {
    setCardsMap((prev) => {
      const filtered = prev.filter(
        (c) => !(c.cardId === cardId && (!role || c.role === role)),
      );
      syncFormCards(filtered);
      return filtered;
    });
  };

  const updateFilters = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const onSubmit = async (data: DeckFormValues) => {
    if (!user) return;
    setLoading(true);

    try {
      if (deck) {
        // Update logic
        const currentCards = cardsMap;
        const initialCards = deck.cards || [];

        // Cards to remove: IDs in initialCards not present in currentCards (by ID)
        const cardsToRemove = initialCards
          .filter(
            (initial) => !currentCards.some((curr) => curr.id === initial.id),
          )
          .filter((c) => c.id !== undefined)
          .map((c) => ({ id: c.id as number }));

        // Cards to update: IDs present in both, check if changed
        const cardsToUpdate = currentCards
          .filter((c) => c.id !== undefined)
          .map((c) => {
            const initial = initialCards.find((init) => init.id === c.id);
            if (initial && (initial.qty !== c.qty || initial.role !== c.role)) {
              return {
                id: c.id!,
                qty: c.qty,
                role: c.role,
              } as unknown as DeckCard;
            }
            return null;
          })
          .filter((c) => c !== null) as DeckCard[];

        // Cards to add: Items in currentCards without ID
        const cardsToAdd = currentCards
          .filter((c) => c.id === undefined)
          .map((c) => ({
            cardId: c.cardId!,
            qty: c.qty,
            role: c.role,
          }));

        const updatePayload = {
          deckName: data.name,
          formatId: String(data.formatId),
          isPublic: !!data.isPublic,
          cardsToAdd,
          cardsToRemove,
          cardsToUpdate,
        };

        const response = await decksService.update(deck.id, updatePayload);
        if (response) {
          toast.success("Deck modifié avec succès !");
          router.push(`/decks/${deck.id}`);
        }
      } else {
        // Create logic
        const sourceCards =
          data.cards && data.cards.length > 0
            ? data.cards
            : cardsMap.map((cm) => ({
                cardId: cm.cardId,
                qty: cm.qty,
                role: cm.role,
              }));

        const cardsPayload = sourceCards
          .filter((c) => !!c.cardId)
          .map((c) => ({
            cardId: String(c.cardId),
            qty: c.qty,
            role: c.role,
          }));

        const creationData = {
          deckName: data.name,
          formatId: data.formatId,
          isPublic: !!data.isPublic,
          cards: cardsPayload,
        };
        const response = await decksService.create(creationData);
        if (response) {
          toast.success("Deck créé avec succès !");
          form.reset({
            name: "",
            formatId: 0,
            isPublic: false,
            cards: [],
          });
          router.push(`/decks/${(response as any).id}`);
        }
      }
    } catch (err: any) {
      console.error("Deck operation error:", err);
      const backendMessage = err?.response?.data?.message;
      let toastMsg = deck
        ? "Erreur lors de la modification du deck"
        : "Erreur lors de la création du deck";
      if (backendMessage) {
        if (Array.isArray(backendMessage)) {
          toastMsg = backendMessage.join(". ");
        } else if (typeof backendMessage === "string") {
          toastMsg = backendMessage;
        }
      }
      toast.error(toastMsg);
    } finally {
      setLoading(false);
    }
  };

  console.log("errors", errors);
  // Helper components
  const FilterSelect = ({
    label,
    placeholder,
    value,
    onChange,
    options,
  }: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (val: string) => void;
    options?: { value: string; label: string }[];
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

  const StatBlock = ({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) => (
    <div className="rounded-lg border bg-card/60 p-3 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );

  const PreviewGrid = ({
    cards,
    onQtyChange,
    onRemove,
    roleLabel,
  }: {
    cards: AddedCard[];
    onQtyChange: (cardId: string, role: string, qty: number) => void;
    onRemove: (cardId?: string, role?: string) => void;
    roleLabel: string;
  }) => {
    if (cards.length === 0) {
      return (
        <div className="text-sm text-muted-foreground py-4">
          Aucune carte {roleLabel === "main" ? "principale" : "side"}.
        </div>
      );
    }
    return (
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {cards.map((c, index) => (
          <div
            key={`${c.cardId}-${c.role}-${index}`}
            className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="relative w-10 h-14 shrink-0 bg-muted rounded overflow-hidden">
              {c.card?.image ? (
                <Image
                  src={`${c.card.image}/low.png`}
                  alt={c.card.name || "Carte"}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Layers className="w-4 h-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate text-sm">
                {c.card?.name || "Carte"}
              </div>
              <div className="text-xs text-muted-foreground">
                {c.card?.set?.name}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={c.qty}
                onChange={(e) =>
                  onQtyChange(c.cardId!, c.role, parseInt(e.target.value) || 1)
                }
                className="w-16 h-8 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(c.cardId, c.role)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <div className="grid xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2 border border-primary/20 shadow-lg">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {deck ? "Modifier le deck" : "Informations du deck"}
                </CardTitle>
                <CardDescription>
                  {deck
                    ? "Modifiez les informations et la composition de votre deck."
                    : "Donnez une identité claire à votre liste avant de composer votre sélection de cartes."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du deck</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nom du deck"
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="formatId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Format</FormLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Choisissez un format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {formats.map((v: any) => (
                            <SelectItem
                              key={v.id}
                              value={v.id.toString()}
                            >
                              {v.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="col-span-full flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
                      <div className="space-y-0.5">
                        <FormLabel>Deck public</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Partagez automatiquement votre deck avec la
                          communauté.
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="bg-linear-to-br from-primary/5 via-background to-secondary/10 border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Aperçu rapide
                </CardTitle>
                <CardDescription>
                  Suivez en direct la répartition de vos cartes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatBlock
                    label="Total cartes"
                    value={mainCount + sideCount}
                  />
                  <StatBlock
                    label="Principal"
                    value={mainCount}
                  />
                  <StatBlock
                    label="Side"
                    value={sideCount}
                  />
                  <StatBlock
                    label="Variétés"
                    value={cardsMap.length}
                  />
                </div>
                <Separator />
                <div className="flex -space-x-3">
                  {cardsMap.slice(0, 4).map((c, index) => (
                    <div
                      key={`${c.cardId}-${index}`}
                      className="relative w-16 h-24 rounded-lg overflow-hidden border border-border/60 shadow-sm bg-card"
                    >
                      {c.card?.image ? (
                        <Image
                          src={`${c.card.image}/low.png`}
                          alt={c.card.name || "Carte"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Layers className="w-5 h-5" />
                        </div>
                      )}
                      <Badge className="absolute bottom-1 right-1 text-[10px]">
                        x{c.qty}
                      </Badge>
                    </div>
                  ))}
                  {cardsMap.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Ajoutez vos premières cartes pour voir l’aperçu.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2 border border-border/60 shadow-lg">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="w-5 h-5 text-primary" />
                      Sélection des cartes
                    </CardTitle>
                    <CardDescription>
                      Retrouvez les filtres avancés du marketplace pour composer
                      votre liste.
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
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) => updateFilters({ sortBy: value })}
                  >
                    <SelectTrigger className="w-full lg:w-48">
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
                    <SelectTrigger className="w-full lg:w-40">
                      <SelectValue placeholder="Ordre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASC">Croissant</SelectItem>
                      <SelectItem value="DESC">Décroissant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <FilterSelect
                    label="Série"
                    placeholder="Toutes les séries"
                    value={filters.serieId || "all"}
                    onChange={(value) =>
                      updateFilters({
                        serieId: value === "all" ? undefined : value,
                      })
                    }
                    options={(series as PokemonSerieType[] | undefined)?.map(
                      (s) => ({
                        value: s.id.toString(),
                        label: s.name,
                      }),
                    )}
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
                    options={(sets as PokemonSetType[] | undefined)?.map(
                      (s) => ({
                        value: s.id.toString(),
                        label: s.name,
                      }),
                    )}
                  />

                  <FilterSelect
                    label="Type d'énergie"
                    placeholder="Tous les types"
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
                      placeholder="Ex: Rare Holo"
                      value={filters.rarity || ""}
                      onChange={(e) =>
                        updateFilters({
                          rarity: e.target.value || undefined,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
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

                  <div className="space-y-1.5">
                    <Label>Prix max (€)</Label>
                    <Input
                      type="number"
                      placeholder="500"
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

                  <div className="space-y-1.5">
                    <Label className="invisible">Actions</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {allCards.map((item: any) => {
                        const card = (item.card || item) as PokemonCardType;
                        const qty = qtyByCard[card.id] || 1;
                        const role = (roleByCard[card.id] as string) || "main";
                        return (
                          <article
                            key={card.id}
                            className="relative rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
                          >
                            <div className="relative aspect-3/4 bg-muted/40">
                              {card.image ? (
                                <Image
                                  src={`${card.image}/low.png`}
                                  alt={card.name || "Carte"}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Layers className="w-6 h-6" />
                                </div>
                              )}
                              {card.rarity && (
                                <Badge className="absolute top-2 left-2 backdrop-blur-sm">
                                  {card.rarity}
                                </Badge>
                              )}
                              {card.set?.name && (
                                <Badge
                                  variant="secondary"
                                  className="absolute bottom-2 left-2"
                                >
                                  {card.set.name}
                                </Badge>
                              )}
                            </div>
                            <div className="p-3 space-y-2">
                              <div className="space-y-0.5">
                                <h3 className="font-semibold line-clamp-1">
                                  {card.name || "Carte"}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {card.description || card.set?.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  value={qty}
                                  onChange={(e) =>
                                    setQtyByCard((prev) => ({
                                      ...prev,
                                      [card.id]: Number(e.target.value),
                                    }))
                                  }
                                  className="w-20 h-9"
                                />
                                <Select
                                  value={role}
                                  onValueChange={(value) =>
                                    setRoleByCard((prev) => ({
                                      ...prev,
                                      [card.id]: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-9 w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="main">
                                      Principal
                                    </SelectItem>
                                    <SelectItem value="side">Side</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  className="flex-1"
                                  onClick={() => addCard(card, qty, role)}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Ajouter
                                </Button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    {meta && (
                      <MarketplacePagination
                        meta={meta}
                        page={page}
                        setPage={setPage}
                      />
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    Aucune carte ne correspond à ces critères.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-lg">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Preview du deck
                </CardTitle>
                <CardDescription>
                  Visualisez vos cartes ajoutées, modifiez les quantités ou
                  supprimez-les.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Tabs defaultValue="main">
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="main">
                      Principal ({mainCount})
                    </TabsTrigger>
                    <TabsTrigger value="side">Side ({sideCount})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="main">
                    <PreviewGrid
                      cards={cardsMap.filter((c) => c.role === "main")}
                      onQtyChange={updateCardQty}
                      onRemove={removeCard}
                      roleLabel="main"
                    />
                  </TabsContent>
                  <TabsContent value="side">
                    <PreviewGrid
                      cards={cardsMap.filter((c) => c.role === "side")}
                      onQtyChange={updateCardQty}
                      onRemove={removeCard}
                      roleLabel="side"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Retour
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : deck ? (
                "Modifier le deck"
              ) : (
                "Créer le deck"
              )}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};;;;;
