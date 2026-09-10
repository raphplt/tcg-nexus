"use client";

import {
  Calendar,
  DollarSign,
  Download,
  Eye,
  Filter,
  Heart,
  Info,
  LayoutGrid,
  List,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  Sparkles,
  Trophy,
  Upload,
  User,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import React, { useEffect, useRef, useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import type { CollectionItemsQueryParams } from "@/services/collection.service";
import { getCollectionItemDisplay } from "@/utils/collection-item";
import type { CollectionItemType } from "@/types/collection";
import type { PaginatedResult } from "@/types/pagination";
import { getCollectionTitle } from "@/utils/collection";

/** Displays mixed inventory with owner-only mutations and recoverable loading states. */
const CollectionDetailPage = () => {
  const t = useTranslations("CollectionDetail");
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const mutationPending = useRef(false);
  const {
    data: collection,
    isPending: loading,
    error: collectionError,
    refetch: fetchCollection,
  } = useQuery({
    queryKey: ["collection", id, user?.id, locale],
    queryFn: () => collectionService.getById(id),
    retry: false,
  });
  const unavailable =
    isAxiosError(collectionError) &&
    [403, 404].includes(collectionError.response?.status ?? 0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("added_at");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedRarity, setSelectedRarity] = useState<string>("ALL");
  const [updatingCardId, setUpdatingCardId] = useState<string | null>(null);

  const canEdit = Boolean(user && collection?.user?.id === user.id);
  const isMasterSet = Boolean(collection?.masterSet);
  const limit = isMasterSet ? 24 : 12;

  const { data: availableRarities = [] } = useQuery({
    queryKey: ["collection-rarities", id, user?.id, locale],
    queryFn: () => collectionService.getSetRarities(id),
    enabled: isMasterSet,
  });

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
    isError: itemsError,
  } = usePaginatedQuery<PaginatedResult<CollectionItemType>>(
    [
      "collection-items",
      id,
      user?.id,
      locale,
      page,
      debouncedSearch,
      sortBy,
      sortOrder,
      selectedRarity,
    ],
    (params: CollectionItemsQueryParams) =>
      collectionService.getItemsPaginated(id, params),
    {
      page,
      limit,
      search: debouncedSearch || undefined,
      sortBy,
      sortOrder,
      rarity: selectedRarity !== "ALL" ? selectedRarity : undefined,
    },
    { enabled: Boolean(id) && Boolean(collection), placeholderData: undefined },
  );

  const [policy, setPolicy] = useState<"BASE_SET" | "MASTER_SET">("BASE_SET");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);

  useEffect(() => {
    if (collection?.completionPolicy) {
      setPolicy(collection.completionPolicy);
    }
  }, [collection?.completionPolicy]);

  const { data: completionData, refetch: refetchCompletion } = useQuery({
    queryKey: ["collection-completion", id, policy, locale],
    queryFn: () => collectionService.getCompletion(id, policy),
    enabled: Boolean(id) && Boolean(collection),
  });

  const { data: valuationData, refetch: refetchValuation } = useQuery({
    queryKey: ["collection-valuation", id, locale],
    queryFn: () => collectionService.getValuation(id),
    enabled: Boolean(id) && Boolean(collection),
  });

  const handleIncrement = async (cardId: string, cardName?: string) => {
    if (!id || !canEdit || mutationPending.current) return;
    mutationPending.current = true;
    setUpdatingCardId(cardId);
    try {
      await collectionService.addCardToCollection(id, cardId);
      toast.success(t("added", { name: cardName || t("card") }));
      await refetchItems();
      await fetchCollection();
      void refetchCompletion();
      void refetchValuation();
    } catch {
      toast.error(t("addError"));
    } finally {
      mutationPending.current = false;
      setUpdatingCardId(null);
    }
  };

  const handleDecrement = async (cardId: string, cardName?: string) => {
    if (!id || !canEdit || mutationPending.current) return;
    mutationPending.current = true;
    setUpdatingCardId(cardId);
    try {
      await collectionService.removeCardFromCollection(id, cardId);
      toast.success(t("removed", { name: cardName || t("card") }));
      await refetchItems();
      await fetchCollection();
      void refetchCompletion();
      void refetchValuation();
    } catch {
      toast.error(t("removeError"));
    } finally {
      mutationPending.current = false;
      setUpdatingCardId(null);
    }
  };

  const handleExportCsv = async () => {
    if (!id || isExporting) return;
    setIsExporting(true);
    try {
      const csv = await collectionService.exportCsv(id);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${collection?.name || "collection"}-inventory.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || isImporting) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const res = await collectionService.importCsv(id, { csvContent: text });
      toast.success(
        t("importSuccess", {
          added: res.importedCount,
          updated: res.updatedCount,
        }),
      );
      await refetchItems();
      await fetchCollection();
      void refetchCompletion();
      void refetchValuation();
    } catch {
      toast.error(t("importError"));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleWishlistMissing = async () => {
    if (!id || isWishlisting) return;
    setIsWishlisting(true);
    try {
      const res = await collectionService.wishlistMissing(id);
      toast.success(t("wishlistSuccess", { count: res.addedCount }));
    } catch {
      toast.error(t("addError"));
    } finally {
      setIsWishlisting(false);
    }
  };

  const handleSellDuplicate = async (itemId: number, currentQty: number) => {
    if (currentQty <= 1) {
      toast.error(t("cannotSellLastCopy"));
      return;
    }
    const priceStr = window.prompt(t("duplicatePrice") + " (EUR):", "10");
    if (!priceStr) return;
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      toast.error(t("addError"));
      return;
    }
    try {
      await collectionService.listDuplicate(id, itemId, {
        price,
        currency: "EUR",
        quantity: 1,
      });
      toast.success(t("duplicateListed"));
      await refetchItems();
      await fetchCollection();
      void refetchCompletion();
      void refetchValuation();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("addError"));
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

  if (!collection || collectionError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">
            {unavailable ? t("unavailable") : t("loadError")}
          </p>
          <Button onClick={() => void fetchCollection()}>{t("retry")}</Button>
        </div>
      </div>
    );
  }

  const meta = itemsData?.meta;
  const items = itemsData?.data || [];

  const ownedDistinctCount =
    completionData?.ownedDistinct ??
    (collection.items?.filter((i) => (i.quantity || 0) > 0).length || 0);
  const totalRequiredCards =
    completionData?.totalRequired ??
    (collection.masterSet?.cardCount?.total || meta?.totalItems || 0);
  const completionPercent =
    completionData?.completionPercentage ??
    (totalRequiredCards > 0
      ? Math.min(
          100,
          Math.round((ownedDistinctCount / totalRequiredCards) * 100),
        )
      : 0);

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
                <div className="flex flex-col items-end shrink-0 gap-1.5">
                  <div className="text-3xl font-extrabold text-amber-500 tabular-nums">
                    {completionPercent}%
                  </div>
                  <Select
                    value={policy}
                    onValueChange={(val: "BASE_SET" | "MASTER_SET") =>
                      setPolicy(val)
                    }
                  >
                    <SelectTrigger className="h-7 text-xs px-2 bg-background/50 border-border/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BASE_SET">
                        {t("policyBaseSet")}
                      </SelectItem>
                      <SelectItem value="MASTER_SET">
                        {t("policyMasterSet")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Master Set Completion Bar */}
            {isMasterSet && (
              <div className="space-y-2 mt-4 pt-4 border-t border-border/50">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    {t("setProgress")}{" "}
                    <strong>{collection.masterSet?.name}</strong>
                  </span>
                  <span className="tabular-nums font-bold text-foreground">
                    {t("ownedCards", {
                      owned: ownedDistinctCount,
                      total: totalRequiredCards,
                    })}
                    {completionData && completionData.duplicatesCount > 0 && (
                      <span className="text-xs font-normal text-muted-foreground ml-1.5">
                        (
                        {t("duplicates", {
                          count: completionData.duplicatesCount,
                        })}
                        )
                      </span>
                    )}
                  </span>
                </div>
                <Progress
                  value={completionPercent}
                  className="h-3 bg-muted [&>div]:bg-amber-500"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-border/40 text-sm text-muted-foreground">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span>
                    {t(isMasterSet ? "cardCount" : "itemCount", {
                      count: meta?.totalItems || totalRequiredCards,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{formatDate(collection.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>
                    {collection.user?.firstName} {collection.user?.lastName}
                  </span>
                </div>
              </div>

              {/* Action buttons: CSV Export / Import / Wishlist Missing */}
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {canEdit && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs"
                      disabled={isImporting}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {t("importCsv")}
                    </Button>
                    {isMasterSet &&
                      completionData &&
                      completionData.missingCardsCount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-xs text-rose-500 border-rose-500/30 hover:border-rose-500"
                          disabled={isWishlisting}
                          onClick={handleWishlistMissing}
                        >
                          <Heart className="w-3.5 h-3.5" />
                          {t("wishlistMissing")}
                        </Button>
                      )}
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  disabled={isExporting}
                  onClick={handleExportCsv}
                >
                  <Download className="w-3.5 h-3.5" />
                  {t("exportCsv")}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Valuation Widget */}
        {valuationData && (
          <Card className="bg-card/90 backdrop-blur-sm border-2 border-border/60 shadow-sm overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    <span className="font-heading font-semibold text-base sm:text-lg">
                      {t("valuationTitle")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("coverage", {
                      percent: Math.round(valuationData.coveragePercentage ?? 0),
                      valued:
                        valuationData.valuedCopiesCount ??
                        valuationData.totalValuedCopies ??
                        0,
                      unvalued:
                        valuationData.unvaluedCopiesCount ??
                        valuationData.totalUnvaluedCopies ??
                        0,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  {(() => {
                    const acqCost =
                      valuationData.totalAcquisitionCost ??
                      valuationData.knownAcquisitionCostEur;
                    if (acqCost == null || acqCost <= 0) return null;
                    const roi =
                      valuationData.unrealizedGainLoss ?? valuationData.roiEur;
                    return (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          {t("acquisitionCost", {
                            cost: `€${acqCost.toFixed(2)}`,
                          })}
                        </div>
                        {roi != null && (
                          <div
                            className={`text-xs font-semibold ${
                              roi >= 0 ? "text-emerald-500" : "text-rose-500"
                            }`}
                          >
                            {t("roi", {
                              roi: `${roi >= 0 ? "+" : ""}€${roi.toFixed(2)}`,
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-500 tabular-nums">
                      €
                      {(
                        valuationData.totalEstimatedValue ??
                        valuationData.estimatedValueEur ??
                        0
                      ).toFixed(2)}
                    </div>
                    {valuationData.estimatedValueUsd != null && (
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                        ~${valuationData.estimatedValueUsd.toFixed(2)} USD
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                    aria-label={t("gridView")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    className="h-8 px-2.5"
                    onClick={() => setViewMode("table")}
                    aria-label={t("tableView")}
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
                  {t("rarity")}
                </span>
                <Button
                  aria-pressed={selectedRarity === "ALL"}
                  size="sm"
                  variant={selectedRarity === "ALL" ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedRarity("ALL");
                    setPage(1);
                  }}
                >
                  {t("allRarities")}
                </Button>
                {availableRarities.map((rarity) => (
                  <Button
                    size="sm"
                    aria-pressed={selectedRarity === rarity}
                    key={rarity}
                    variant={selectedRarity === rarity ? "default" : "outline"}
                    className="cursor-pointer transition-colors whitespace-nowrap"
                    onClick={() => {
                      setSelectedRarity(rarity);
                      setPage(1);
                    }}
                  >
                    {rarity}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Section */}
        {itemsError ? (
          <div role="alert" className="text-center space-y-4 py-10">
            <p>{t("loadError")}</p>
            <Button onClick={() => void refetchItems()}>{t("retry")}</Button>
          </div>
        ) : itemsLoading ? (
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
                  {debouncedSearch || selectedRarity !== "ALL"
                    ? t("noResults")
                    : t("empty")}
                </p>
                <p className="text-muted-foreground">
                  {debouncedSearch || selectedRarity !== "ALL"
                    ? t("tryOtherKeywords")
                    : canEdit
                      ? t("startAdding")
                      : t("emptyVisitor")}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          /* Grid / Hole Grid Display */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((item) => {
              const pokemon = getCollectionItemDisplay(item);
              const isOwned = (item.quantity || 0) > 0;
              const isUpdating = updatingCardId === pokemon.id;

              return (
                <div
                  key={item.id ?? `${pokemon.kind}-${pokemon.id}`}
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
                        {t("missing")}
                      </Badge>
                    )}
                  </div>

                  {/* Card Image */}
                  <div className="relative aspect-[3/4] w-full my-1 flex items-center justify-center">
                    <Link
                      href={pokemon.href}
                      className="relative w-full h-full block"
                    >
                      <SmartImage
                        src={pokemon.image}
                        fallbackSrc={
                          pokemon.kind === "sealed"
                            ? "/images/sealed-placeholder.svg"
                            : "/images/carte-pokemon-dos.jpg"
                        }
                        alt={pokemon.name || t("unknownItem")}
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
                      href={pokemon.href}
                      className="font-medium text-xs truncate block hover:text-primary transition-colors"
                      title={pokemon.name}
                    >
                      {pokemon.name}
                    </Link>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="truncate max-w-[80px]">
                        {pokemon.kind === "sealed"
                          ? t("sealedProduct")
                          : pokemon.rarity || "—"}
                      </span>
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      {pokemon.condition
                        ? pokemon.kind === "sealed"
                          ? t(`sealedCondition.${pokemon.condition}`)
                          : pokemon.condition
                        : t("unknownCondition")}
                    </p>

                    {/* Quick +/- Action Buttons */}
                    {canEdit && pokemon.kind === "card" && (
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
                              aria-label={t("decrement")}
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
                              aria-label={t("increment")}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            {canEdit && (item.quantity || 0) > 1 && item.id && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded-md text-muted-foreground hover:text-emerald-500"
                                title={t("sellDuplicate")}
                                onClick={() =>
                                  handleSellDuplicate(item.id!, item.quantity)
                                }
                              >
                                <DollarSign className="w-3 h-3" />
                              </Button>
                            )}
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
                                {t("acquired")}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
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
                      <TableHead className="text-center">{t("hp")}</TableHead>
                      <TableHead className="text-right">
                        {t("actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const pokemon = getCollectionItemDisplay(item);
                      const isOwned = (item.quantity || 0) > 0;
                      const isUpdating = updatingCardId === pokemon.id;

                      return (
                        <TableRow
                          key={item.id ?? `${pokemon.kind}-${pokemon.id}`}
                          className={!isOwned ? "opacity-60 bg-muted/10" : ""}
                        >
                          <TableCell>
                            <div className="w-14 h-20 relative">
                              <SmartImage
                                src={pokemon.image}
                                fallbackSrc={
                                  pokemon.kind === "sealed"
                                    ? "/images/sealed-placeholder.svg"
                                    : "/images/carte-pokemon-dos.jpg"
                                }
                                alt={pokemon.name || t("unknownItem")}
                                className={`h-full w-full object-contain rounded ${
                                  !isOwned ? "grayscale opacity-50" : ""
                                }`}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link
                              href={pokemon.href}
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
                              {canEdit &&
                                pokemon.kind === "card" &&
                                isOwned && (
                                  <Button
                                    aria-label={t("decrement")}
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
                              {canEdit && pokemon.kind === "card" && (
                                <Button
                                  aria-label={t("increment")}
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
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {pokemon.condition
                                ? pokemon.kind === "sealed"
                                  ? t(`sealedCondition.${pokemon.condition}`)
                                  : pokemon.condition
                                : t("unknownCondition")}
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
                            <div className="flex items-center justify-end gap-1">
                              {canEdit &&
                                (item.quantity || 0) > 1 &&
                                item.id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-emerald-500"
                                    title={t("sellDuplicate")}
                                    onClick={() =>
                                      handleSellDuplicate(
                                        item.id!,
                                        item.quantity,
                                      )
                                    }
                                  >
                                    <DollarSign className="w-4 h-4" />
                                  </Button>
                                )}
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                aria-label={t("viewDetails")}
                              >
                                <Link href={pokemon.href}>
                                  <Info className="w-4 h-4" />
                                </Link>
                              </Button>
                            </div>
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
