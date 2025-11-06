"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { marketplaceService } from "@/services/marketplace.service";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { PriceChart } from "@/components/Marketplace/PriceChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/utils/price";
import { rarityToImage, typeToImage } from "@/utils/images";
import { slugify } from "@/utils/text";
import { cardStates } from "@/utils/variables";
import { getCardStateColor } from "../../utils";
import { cardEventTracker } from "@/services/card-event-tracker.service";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";

export default function CardDetailPage() {
  const { id } = useParams();
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [cardStateFilter, setCardStateFilter] = useState<string>("all");

  // Récupère les détails de la carte
  const { data: card, isLoading: loadingCard } = useQuery({
    queryKey: ["pokemon-card", id],
    queryFn: () => pokemonCardService.getById(id as string),
    enabled: !!id,
  });

  // Récupère les statistiques de la carte
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["card-stats", id, currencyFilter, cardStateFilter],
    queryFn: () =>
      marketplaceService.getCardStatistics(
        id as string,
        currencyFilter && currencyFilter !== "all" ? currencyFilter : undefined,
        cardStateFilter && cardStateFilter !== "all"
          ? cardStateFilter
          : undefined,
      ),
    enabled: !!id,
  });

  // Récupère les offres disponibles pour la carte
  const { data: listings, isLoading: loadingListings } = useQuery({
    queryKey: ["card-listings", id, currencyFilter, cardStateFilter],
    queryFn: () =>
      marketplaceService.getPaginated({
        pokemonCardId: id as string,
        currency:
          currencyFilter && currencyFilter !== "all"
            ? currencyFilter
            : undefined,
        cardState:
          cardStateFilter && cardStateFilter !== "all"
            ? cardStateFilter
            : undefined,
        limit: 50,
      }),
    enabled: !!id,
  });

  // Track view event when card is loaded
  useEffect(() => {
    if (id && card) {
      cardEventTracker.trackView(id as string, {
        referrer: document.referrer || undefined,
      });
    }
  }, [id, card]);

  if (loadingCard) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto py-12 px-4">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!card) {
    return (
      <Alert
        variant="destructive"
        className="max-w-2xl mx-auto mt-12"
      >
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          Carte non trouvée. Veuillez réessayer plus tard.
        </AlertDescription>
      </Alert>
    );
  }

  const filteredListings = listings?.data || [];
  const minPriceListing =
    filteredListings.length > 0
      ? filteredListings.reduce((min, listing) =>
          parseFloat(listing.price.toString()) <
          parseFloat(min.price.toString())
            ? listing
            : min,
        )
      : null;

  // Calcul du trend du prix
  const priceHistory = stats?.priceHistory || [];
  const firstPrice = priceHistory[0]?.price;
  const lastPrice = priceHistory[priceHistory.length - 1]?.price;
  const trend =
    priceHistory.length > 1 &&
    firstPrice !== undefined &&
    lastPrice !== undefined
      ? ((lastPrice - firstPrice) / firstPrice) * 100
      : 0;

  const isGoodDeal =
    stats &&
    minPriceListing &&
    stats.avgPrice &&
    parseFloat(minPriceListing.price.toString()) < stats.avgPrice * 0.8;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <MarketplaceBreadcrumb />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-6">
              <div className="relative aspect-[3/4] w-full max-w-md mx-auto">
                {card.image ? (
                  <Image
                    src={card.image + "/high.png"}
                    alt={card.name || "Carte inconnue"}
                    fill
                    className="object-contain rounded-lg"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {card.set && (
                  <Badge
                    variant="outline"
                    className="text-sm px-3 py-1"
                  >
                    <Image
                      src={card.set.symbol || ""}
                      alt={card.set.name}
                      width={16}
                      height={16}
                    />
                    {card.set.name}
                  </Badge>
                )}
                {card.rarity && (
                  <Badge
                    variant="outline"
                    className="text-sm px-3 py-1 flex items-center gap-1"
                  >
                    <Image
                      src={rarityToImage[card.rarity]}
                      alt={card.rarity}
                      width={16}
                      height={16}
                    />
                    {card.rarity}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-3xl">
                  {card.types?.map((type) => (
                    <Image
                      key={type}
                      src={typeToImage[slugify(type.toLowerCase())] || ""}
                      alt={type}
                      width={28}
                      height={28}
                    />
                  ))}
                  {card.name}
                  {card.localId && (
                    <span className="text-lg text-muted-foreground font-normal">
                      #{card.localId}
                    </span>
                  )}
                </CardTitle>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {card.category && <span>{card.category}</span>}
                  {card.illustrator && (
                    <>
                      <span>·</span>
                      <span>Illus. {card.illustrator}</span>
                    </>
                  )}
                  {card.stage && (
                    <>
                      <span>·</span>
                      <span>{card.stage}</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {card.types && card.types.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {card.types.map((type) => (
                      <Badge
                        key={type}
                        variant="secondary"
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                )}
                {card.hp && <Badge variant="outline">{card.hp} PV</Badge>}
                {card.attacks && card.attacks.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Attaques :</h4>
                    <ul className="space-y-2">
                      {card.attacks.map((atk, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2"
                        >
                          <span className="font-medium">{atk.name}</span>
                          {atk.damage && (
                            <Badge variant="outline">{atk.damage}</Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Price Summary */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle>Prix du marché</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.totalListings > 0 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Prix minimum
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {stats.minPrice !== null
                            ? formatPrice(
                                stats.minPrice,
                                stats.currency || "EUR",
                              )
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Prix moyen
                        </span>
                        <span className="text-lg font-semibold">
                          {stats.avgPrice !== null
                            ? formatPrice(
                                stats.avgPrice,
                                stats.currency || "EUR",
                              )
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Prix maximum
                        </span>
                        <span className="text-lg">
                          {stats.maxPrice !== null
                            ? formatPrice(
                                stats.maxPrice,
                                stats.currency || "EUR",
                              )
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-muted-foreground">
                          Offres disponibles
                        </span>
                        <Badge variant="secondary">{stats.totalListings}</Badge>
                      </div>
                      {isGoodDeal && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-green-600 font-semibold">
                            <Star className="w-4 h-4" />
                            Bon deal disponible !
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Aucune offre disponible pour le moment
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {stats && priceHistory.length > 0 && (
          <PriceChart
            data={priceHistory}
            currency={stats.currency || "EUR"}
            showTrend={true}
          />
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Offres disponibles</CardTitle>
              <div className="flex gap-2">
                <Select
                  value={currencyFilter}
                  onValueChange={setCurrencyFilter}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Devise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={cardStateFilter}
                  onValueChange={setCardStateFilter}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="État" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
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
            </div>
          </CardHeader>
          <CardContent>
            {loadingListings ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-16 w-full"
                  />
                ))}
              </div>
            ) : filteredListings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendeur</TableHead>
                    <TableHead>État</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredListings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell>
                        <Link
                          href={`/marketplace/sellers/${listing.seller.id}`}
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={listing.seller.avatarUrl} />
                            <AvatarFallback>
                              {listing.seller.firstName[0]}
                              {listing.seller.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {listing.seller.firstName} {listing.seller.lastName}
                          </span>
                        </Link>
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
                        {formatPrice(listing.price, listing.currency)}
                      </TableCell>
                      <TableCell>{listing.quantityAvailable}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (id) {
                              cardEventTracker.trackAddToCart(
                                id as string,
                                listing.id,
                              );
                            }
                          }}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Ajouter
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Aucune offre disponible avec ces filtres
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
