"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircle,
  Package,
  ShoppingBag,
  Star,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CardCard } from "@/components/Marketplace/CardCard";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
import { ViewToggle } from "@/components/Marketplace/ViewToggle";
import { H1, H2 } from "@/components/Shared/Titles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useViewMode } from "@/hooks/useViewMode";
import { marketplaceService } from "@/services/marketplace.service";
import { formatPrice, formatPrice as formatPriceUtil } from "@/utils/price";
import { getCardStateColor } from "../../utils";
import { SealedProductCard } from "@/components/Marketplace/SealedProductCard";
import { SealedCondition, sealedConditionLabels } from "@/types/sealed-product";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const getSealedConditionColor = (condition: string | null | undefined) => {
  switch (condition) {
    case "sealed":
      return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
    case "box_damaged":
      return "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "opened_resealed":
      return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export default function SellerPage() {
  const { id } = useParams();
  const sellerId = parseInt(id as string);
  const [viewMode, setViewMode] = useViewMode("grid");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [productKind, setProductKind] = useState<"all" | "card" | "sealed">("all");

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy, sortOrder, productKind]);

  // Fetch seller statistics
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["seller-stats", sellerId],
    queryFn: () => marketplaceService.getSellerStatistics(sellerId),
    enabled: !!sellerId && !isNaN(sellerId),
  });

  // Fetch seller listings
  const { data: listings, isLoading: loadingListings } = useQuery({
    queryKey: [
      "seller-listings",
      sellerId,
      page,
      debouncedSearch,
      sortBy,
      sortOrder,
      productKind,
    ],
    queryFn: () =>
      marketplaceService.getSellerListings(sellerId, {
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
        productKind: productKind === "all" ? undefined : productKind,
      }),
    enabled: !!sellerId && !isNaN(sellerId),
  });

  if (loadingStats || !sellerId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Vendeur non trouvé
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const sellerListings = listings?.data ?? [];
  const seller =
    stats.seller ?? stats.listings?.[0]?.seller ?? sellerListings?.[0]?.seller;

  if (!seller) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Vendeur non trouvé
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <MarketplaceBreadcrumb />
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={seller.avatarUrl} />
                <AvatarFallback className="text-2xl">
                  {seller.firstName[0]}
                  {seller.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <H1 className="text-3xl">
                    {seller.firstName} {seller.lastName}
                  </H1>
                  {seller.isPro && (
                    <Badge variant="secondary" className="text-sm">
                      Vendeur Pro
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  Membre depuis{" "}
                  {seller.createdAt
                    ? new Date(seller.createdAt).toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "long",
                      })
                    : "récemment"}
                </p>
              </div>
              <div className="flex gap-2">
                {seller.email && (
                  <a href={`mailto:${seller.email}`}>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Contacter
                    </Badge>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="w-4 h-4" />
                Offres actives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeListings}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.totalListings} au total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Ventes totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalSales}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Commandes complétées
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Chiffre d'affaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatPrice(stats.totalRevenue, "EUR")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Total généré
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Star className="w-4 h-4" />
                Panier moyen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatPrice(stats.avgOrderValue, "EUR")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Par commande
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <H2>Offres du vendeur</H2>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {listings?.meta?.totalItems ?? 0} offre
                {(listings?.meta?.totalItems ?? 0) > 1 ? "s" : ""}
              </Badge>
              <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une offre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={productKind}
                onValueChange={(value) => setProductKind(value as "all" | "card" | "sealed")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type de produit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les produits</SelectItem>
                  <SelectItem value="card">Cartes</SelectItem>
                  <SelectItem value="sealed">Produits Scellés</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(value) => {
                  const [newSortBy, newSortOrder] = value.split("-");
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder as "ASC" | "DESC");
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-DESC">Plus récent</SelectItem>
                  <SelectItem value="createdAt-ASC">Plus ancien</SelectItem>
                  <SelectItem value="name-ASC">Nom (A-Z)</SelectItem>
                  <SelectItem value="name-DESC">Nom (Z-A)</SelectItem>
                  <SelectItem value="price-ASC">Prix : croissant</SelectItem>
                  <SelectItem value="price-DESC">Prix : décroissant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingListings ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </div>
          ) : sellerListings.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sellerListings.map((listing) => {
                  const isCard =
                    listing.productKind === "card" || !!listing.pokemonCard;
                  if (isCard) {
                    if (!listing.pokemonCard) return null;
                    return (
                      <CardCard
                        key={listing.id}
                        card={listing.pokemonCard}
                        minPrice={parseFloat(listing.price.toString())}
                        listingCount={listing.quantityAvailable}
                        currency={listing.currency}
                      />
                    );
                  } else {
                    if (!listing.sealedProduct) return null;
                    return (
                      <SealedProductCard
                        key={listing.id}
                        product={listing.sealedProduct}
                        price={parseFloat(listing.price.toString())}
                        quantity={listing.quantityAvailable}
                        currency={listing.currency}
                        condition={listing.sealedCondition ?? undefined}
                        listingId={listing.id}
                      />
                    );
                  }
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>État / Condition</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellerListings.map((listing) => {
                        const isCard =
                          listing.productKind === "card" ||
                          !!listing.pokemonCard;
                        const productName = isCard
                          ? listing.pokemonCard?.name
                          : listing.sealedProduct?.nameEn;
                        const productSetName = isCard
                          ? listing.pokemonCard?.set?.name
                          : listing.sealedProduct?.pokemonSet?.name;
                        const productLink = isCard
                          ? `/marketplace/cards/${listing.pokemonCard?.id}`
                          : `/marketplace/sealed/${listing.sealedProduct?.id}`;
                        const conditionLabel = isCard
                          ? (listing.cardState ?? "")
                          : listing.sealedCondition
                            ? sealedConditionLabels[
                                listing.sealedCondition as SealedCondition
                              ] || listing.sealedCondition
                            : "";
                        const conditionColor = isCard
                          ? getCardStateColor(listing.cardState ?? "")
                          : getSealedConditionColor(listing.sealedCondition);

                        return (
                          <TableRow key={listing.id}>
                            <TableCell>
                              {productName ? (
                                <Link
                                  href={productLink}
                                  className="hover:text-primary transition-colors font-medium"
                                >
                                  {productName}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground italic">
                                  Produit inconnu
                                </span>
                              )}
                              {productSetName && (
                                <div className="text-xs text-muted-foreground">
                                  {productSetName}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={conditionColor}
                              >
                                {conditionLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatPriceUtil(listing.price, listing.currency)}
                            </TableCell>
                            <TableCell>{listing.quantityAvailable}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(listing.createdAt).toLocaleDateString(
                                "fr-FR",
                              )}
                            </TableCell>
                            <TableCell>
                              <Link href={productLink}>
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer hover:bg-accent"
                                >
                                  Voir
                                </Badge>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucune offre disponible pour le moment
              </CardContent>
            </Card>
          )}

          {listings && listings.meta && listings.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!listings.meta.hasPreviousPage}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {listings.meta.currentPage} sur {listings.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(listings.meta.totalPages, p + 1))}
                disabled={!listings.meta.hasNextPage}
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
