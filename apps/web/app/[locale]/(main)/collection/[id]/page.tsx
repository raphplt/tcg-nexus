"use client";

import {
  Calendar,
  Eye,
  Filter,
  Info,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  Minus,
  Package,
  Plus,
  Search,
  Sparkles,
  Trophy,
  User,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { SmartImage } from "@/components/ui/SmartImage";
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
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { Link } from "@/i18n/navigation";
import { collectionService } from "@/services/collection.service";
import { PokemonCardType } from "@/types/cardPokemon";
import { Collection, CollectionItemType } from "@/types/collection";
import type { PaginatedResult } from "@/types/pagination";
import { getCollectionTitle } from "@/utils/collection";
import { getCardImage } from "@/utils/images";

const CollectionDetailPage = () => {
  const t = useTranslations("CollectionDetail");
  const locale = useLocale();
  const { id } = useParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("added_at");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [availableRarities, setAvailableRarities] = useState<string[]>([]);
  const [selectedRarity, setSelectedRarity] = useState<string>("ALL");
  const [updatingCardId, setUpdatingCardId] = useState<string | null>(null);

  const isMasterSet = Boolean(collection?.masterSet);
  const limit = isMasterSet ? 24 : 12;

  const fetchCollection = async () => {
    try {
      const collectionData = await collectionService.getById(id as string);
      setCollection(collectionData);

      if (collectionData.masterSet) {
        try {
          const rarities = await collectionService.getSetRarities(id as string);
          setAvailableRarities(rarities || []);
        } catch (err) {
          console.error("Failed to load set rarities", err);
        }
      }
    } catch (error) {
      console.error(t("loadError"), error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCollection();
  }, [id]);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: itemsData,
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = usePaginatedQuery<PaginatedResult<CollectionItemType>>(
    [
      "collection-items",
      id,
      page,
      debouncedSearch,
      sortBy,
      sortOrder,
      selectedRarity,
    ],
    (params: any) => collectionService.getItemsPaginated(id as string, params),
    {
      page,
      limit,
      search: debouncedSearch || undefined,
      sortBy,
      sortOrder,
      rarity: selectedRarity !== "ALL" ? selectedRarity : undefined,
    },
    { enabled: Boolean(id) && collection !== null },
  );

  const handleIncrement = async (cardId: string, cardName?: string) => {
    if (!id) return;
    setUpdatingCardId(cardId);
    try {
      await collectionService.addCardToCollection(id as string, cardId);
      toast.success(
        cardName ? `+1 "${cardName}" ajouté !` : "+1 carte ajoutée !",
      );
      await refetchItems();
      await fetchCollection();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur lors de l'ajout");
    } finally {
      setUpdatingCardId(null);
    }
  };

  const handleDecrement = async (cardId: string, cardName?: string) => {
    if (!id) return;
    setUpdatingCardId(cardId);
    try {
      await collectionService.removeCardFromCollection(id as string, cardId);
      toast.success(
        cardName ? `"${cardName}" retirée/décrémentée.` : "Carte retirée.",
      );
      await refetchItems();
      await fetchCollection();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur lors du retrait");
    } finally {
      setUpdatingCardId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">
            Collection introuvable.
          </p>
        </div>
      </div>
    );
  }

  const meta = itemsData?.meta;
  const items = itemsData?.data || [];

  const ownedItemsCount =
    collection.items?.filter((i) => (i.quantity || 0) > 0).length || 0;
  const totalSetCards =
    collection.masterSet?.cardCount?.total || meta?.totalItems || 0;
  const completionPercent =
    totalSetCards > 0
      ? Math.min(100, Math.round((ownedItemsCount / totalSetCards) * 100))
      : 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const generatePaginationPages = () => {
    if (!meta) return [];
    const pages: (number | "ellipsis")[] = [];
    const totalPages = meta.totalPages;
    const currentPage = meta.currentPage;
    const maxVisiblePages = 7;
    const sidePages = 2;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let startPage = Math.max(2, currentPage - sidePages);
      let endPage = Math.min(totalPages - 1, currentPage + sidePages);

      if (currentPage <= sidePages + 2) {
        endPage = Math.min(maxVisiblePages - 2, totalPages - 1);
      }

      if (currentPage >= totalPages - sidePages - 1) {
        startPage = Math.max(2, totalPages - maxVisiblePages + 2);
      }

      if (startPage > 2) {
        pages.push("ellipsis");
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages - 1) {
        pages.push("ellipsis");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <Card className="bg-card/90 backdrop-blur-sm border-2 border-border/60 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-amber-500/10 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
                    {getCollectionTitle(collection)}
                  </CardTitle>
                  {isMasterSet ? (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-1">
                      <Trophy className="w-3.5 h-3.5" />
                      Master Set
                    </Badge>
                  ) : (
                    <Badge
                      variant={collection.isPublic ? "default" : "secondary"}
                      className="text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {collection.isPublic ? t("public") : t("private")}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-base text-muted-foreground max-w-2xl">
                  {isMasterSet
                    ? t("masterSetDescription", {
                        set: collection.masterSet?.name ?? "",
                      })
                    : collection.description || t("noDescription")}
                </CardDescription>
              </div>

              {isMasterSet && (
                <div className="flex flex-col items-end shrink-0">
                  <div className="text-3xl font-extrabold text-amber-500 tabular-nums">
                    {completionPercent}%
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Complétion
                  </p>
                </div>
              )}
            </div>

            {/* Master Set Completion Bar */}
            {isMasterSet && (
              <div className="space-y-2 mt-4 pt-4 border-t border-border/50">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Progression de l&apos;extension{" "}
                    <strong>{collection.masterSet?.name}</strong>
                  </span>
                  <span className="tabular-nums font-bold text-foreground">
                    {ownedItemsCount} / {totalSetCards} cartes possédées
                  </span>
                </div>
                <Progress
                  value={completionPercent}
                  className="h-3 bg-muted [&>div]:bg-amber-500"
                />
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-4 border-t border-border/40 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span>
                  {t("cardCount", { count: meta?.totalItems || totalSetCards })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{formatDate(collection.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <User className="h-4 w-4 text-primary" />
                <span>
                  {collection.user?.firstName} {collection.user?.lastName}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Filter Controls Bar */}
        <Card className="bg-card/80 backdrop-blur-sm border-2">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex-1 w-full relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder={t("sortBy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="added_at">{t("sortAddedAt")}</SelectItem>
                    <SelectItem value="pokemonCard.name">
                      {t("sortName")}
                    </SelectItem>
                    <SelectItem value="pokemonCard.rarity">
                      {t("sortRarity")}
                    </SelectItem>
                    <SelectItem value="quantity">
                      {t("sortQuantity")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sortOrder}
                  onValueChange={(value: "ASC" | "DESC") => setSortOrder(value)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={t("order")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASC">{t("orderAsc")}</SelectItem>
                    <SelectItem value="DESC">{t("orderDesc")}</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex items-center rounded-lg border bg-muted/30 p-1">
                  <Button
                    size="sm"
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    className="h-8 px-2.5"
                    onClick={() => setViewMode("grid")}
                    title="Vue Grille"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    className="h-8 px-2.5"
                    onClick={() => setViewMode("table")}
                    title="Vue Tableau"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Rarity Filter Chips */}
            {isMasterSet && availableRarities.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 text-xs">
                <span className="text-muted-foreground flex items-center gap-1 shrink-0 mr-1">
                  <Filter className="w-3 h-3" />
                  Rareté :
                </span>
                <Badge
                  variant={selectedRarity === "ALL" ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedRarity("ALL");
                    setPage(1);
                  }}
                >
                  Toutes
                </Badge>
                {availableRarities.map((rarity) => (
                  <Badge
                    key={rarity}
                    variant={selectedRarity === rarity ? "default" : "outline"}
                    className="cursor-pointer transition-colors whitespace-nowrap"
                    onClick={() => {
                      setSelectedRarity(rarity);
                      setPage(1);
                    }}
                  >
                    {rarity}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Section */}
        {itemsLoading ? (
          <Card className="bg-card/80 backdrop-blur-sm border-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("loadingCards")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur-sm border-2">
            <CardContent className="pt-6">
              <div className="text-center py-16">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">
                  {debouncedSearch ? t("noResults") : t("empty")}
                </p>
                <p className="text-muted-foreground">
                  {debouncedSearch ? t("tryOtherKeywords") : t("startAdding")}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          /* Grid / Hole Grid Display */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((item) => {
              const pokemon = item.pokemonCard;
              const isOwned = (item.quantity || 0) > 0;
              const isUpdating = updatingCardId === pokemon.id;

              return (
                <div
                  key={pokemon.id || item.id}
                  className={`group relative rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${
                    isOwned
                      ? "bg-card shadow-sm hover:shadow-md border-border/80 hover:border-primary/50"
                      : "bg-muted/20 border-dashed border-border/60 hover:border-border"
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      #{pokemon.id?.split("-").pop() || "?"}
                    </span>
                    {isOwned ? (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20"
                      >
                        x{item.quantity}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground border-dashed"
                      >
                        Manquante
                      </Badge>
                    )}
                  </div>

                  {/* Card Image */}
                  <div className="relative aspect-[3/4] w-full my-1 flex items-center justify-center">
                    <Link
                      href={`/marketplace/cards/${pokemon.id}`}
                      className="relative w-full h-full block"
                    >
                      <SmartImage
                        src={getCardImage(pokemon, "low")}
                        fallbackSrc="/images/carte-pokemon-dos.jpg"
                        alt={pokemon.name || "Carte"}
                        className={`h-full w-full object-contain transition-all duration-300 ${
                          isOwned
                            ? "group-hover:scale-105"
                            : "grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105"
                        }`}
                      />
                    </Link>
                  </div>

                  {/* Card Info */}
                  <div className="mt-2 space-y-1">
                    <Link
                      href={`/marketplace/cards/${pokemon.id}`}
                      className="font-medium text-xs truncate block hover:text-primary transition-colors"
                      title={pokemon.name}
                    >
                      {pokemon.name}
                    </Link>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="truncate max-w-[80px]">
                        {pokemon.rarity || "—"}
                      </span>
                    </div>

                    {/* Quick +/- Action Buttons */}
                    <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/40">
                      {isOwned ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive"
                            disabled={isUpdating}
                            onClick={() =>
                              handleDecrement(pokemon.id, pokemon.name)
                            }
                            title="Décrémenter"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-xs font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-primary"
                            disabled={isUpdating}
                            onClick={() =>
                              handleIncrement(pokemon.id, pokemon.name)
                            }
                            title="Incrémenter"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-6 text-[11px] px-1.5 border-primary/30 hover:border-primary text-primary"
                          disabled={isUpdating}
                          onClick={() =>
                            handleIncrement(pokemon.id, pokemon.name)
                          }
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-3 h-3 mr-1" />
                              Acquise
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table Display */
          <Card className="mb-6 bg-card/80 backdrop-blur-sm border-2">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">{t("image")}</TableHead>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("set")}</TableHead>
                      <TableHead className="text-center">
                        {t("quantity")}
                      </TableHead>
                      <TableHead>{t("condition")}</TableHead>
                      <TableHead>{t("rarity")}</TableHead>
                      <TableHead className="text-center">PV</TableHead>
                      <TableHead className="text-right">
                        {t("actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const pokemon = item.pokemonCard;
                      const isOwned = (item.quantity || 0) > 0;
                      const isUpdating = updatingCardId === pokemon.id;

                      return (
                        <TableRow
                          key={pokemon.id || item.id}
                          className={!isOwned ? "opacity-60 bg-muted/10" : ""}
                        >
                          <TableCell>
                            <div className="w-14 h-20 relative">
                              <SmartImage
                                src={getCardImage(pokemon, "low")}
                                fallbackSrc="/images/carte-pokemon-dos.jpg"
                                alt={pokemon.name || "Carte"}
                                className={`h-full w-full object-contain rounded ${
                                  !isOwned ? "grayscale opacity-50" : ""
                                }`}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link
                              href={`/marketplace/cards/${pokemon.id}`}
                              className="hover:underline"
                            >
                              {pokemon.name || "?"}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {pokemon.set?.name || "?"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isOwned && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  disabled={isUpdating}
                                  onClick={() =>
                                    handleDecrement(pokemon.id, pokemon.name)
                                  }
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                              )}
                              <Badge
                                variant={isOwned ? "secondary" : "outline"}
                                className={!isOwned ? "border-dashed" : ""}
                              >
                                {item.quantity || 0}
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                disabled={isUpdating}
                                onClick={() =>
                                  handleIncrement(pokemon.id, pokemon.name)
                                }
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.cardState?.name || "NM"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {pokemon.rarity ? (
                              <Badge variant="outline">{pokemon.rarity}</Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {pokemon.hp ? (
                              <span className="font-medium">{pokemon.hp}</span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              aria-label="Voir les détails"
                            >
                              <Link href={`/marketplace/cards/${pokemon.id}`}>
                                <Info className="w-4 h-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <Card className="bg-card/80 backdrop-blur-sm border-2">
            <CardContent className="pt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (meta.hasPreviousPage) {
                          setPage(page - 1);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      aria-disabled={!meta.hasPreviousPage}
                      tabIndex={!meta.hasPreviousPage ? -1 : 0}
                      className={
                        !meta.hasPreviousPage
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {generatePaginationPages().map((pageNum, idx) => (
                    <PaginationItem key={`page-${pageNum}-${idx}`}>
                      {pageNum === "ellipsis" ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(pageNum as number);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          isActive={pageNum === meta.currentPage}
                          className="cursor-pointer min-w-[2.5rem]"
                        >
                          {pageNum}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (meta.hasNextPage) {
                          setPage(page + 1);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      aria-disabled={!meta.hasNextPage}
                      tabIndex={!meta.hasNextPage ? -1 : 0}
                      className={
                        !meta.hasNextPage
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <div className="text-center mt-4 text-sm text-muted-foreground">
                {t("pagination", {
                  page: meta.currentPage,
                  pages: meta.totalPages,
                  count: meta.totalItems,
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CollectionDetailPage;
