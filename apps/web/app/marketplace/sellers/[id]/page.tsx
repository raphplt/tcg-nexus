"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { marketplaceService } from "@/services/marketplace.service";
import { SellerCard } from "@/components/Marketplace/SellerCard";
import { CardCard } from "@/components/Marketplace/CardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { H1, H2 } from "@/components/Shared/Titles";
import { formatPrice } from "@/utils/price";
import { ShoppingBag, TrendingUp, Star, Package, MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatPrice as formatPriceUtil } from "@/utils/price";
import { getCardStateColor } from "../../utils";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";

export default function SellerPage() {
  const { id } = useParams();
  const sellerId = parseInt(id as string);

  // Fetch seller statistics
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["seller-stats", sellerId],
    queryFn: () => marketplaceService.getSellerStatistics(sellerId),
    enabled: !!sellerId && !isNaN(sellerId),
  });

  // Fetch seller listings
  const { data: listings, isLoading: loadingListings } = useQuery({
    queryKey: ["seller-listings", sellerId],
    queryFn: () => marketplaceService.getSellerListings(sellerId),
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

  const seller = listings?.[0]?.seller;

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
                    <Badge
                      variant="secondary"
                      className="text-sm"
                    >
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
                <Link href={`/marketplace/sellers/${sellerId}`}>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    Contacter
                  </Badge>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
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

        {/* Listings */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <H2>Offres du vendeur</H2>
            <Badge variant="secondary">
              {listings?.length || 0} offre
              {listings && listings.length > 1 ? "s" : ""}
            </Badge>
          </div>

          {loadingListings ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-80"
                />
              ))}
            </div>
          ) : listings && listings.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {listings.map((listing) => (
                  <CardCard
                    key={listing.id}
                    card={listing.pokemonCard}
                    minPrice={parseFloat(listing.price.toString())}
                    listingCount={listing.quantityAvailable}
                    currency={listing.currency}
                  />
                ))}
              </div>

              {/* Listings Table View */}
              <Card>
                <CardHeader>
                  <CardTitle>Liste détaillée</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Carte</TableHead>
                        <TableHead>État</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listings.map((listing) => (
                        <TableRow key={listing.id}>
                          <TableCell>
                            <Link
                              href={`/marketplace/cards/${listing.pokemonCard.id}`}
                              className="hover:text-primary transition-colors font-medium"
                            >
                              {listing.pokemonCard.name}
                            </Link>
                            {listing.pokemonCard.set && (
                              <div className="text-xs text-muted-foreground">
                                {listing.pokemonCard.set.name}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getCardStateColor(listing.cardState)}
                            >
                              {listing.cardState}
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
                            <Link href={`/marketplace/${listing.id}`}>
                              <Badge
                                variant="outline"
                                className="cursor-pointer hover:bg-accent"
                              >
                                Voir
                              </Badge>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucune offre disponible pour le moment
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

