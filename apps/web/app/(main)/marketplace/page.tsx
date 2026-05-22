"use client";

import {
  ArrowRight,
  Flame,
  Package,
  Star,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { CardCard } from "@/components/Marketplace/CardCard";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
import { SealedProductsPreview } from "@/components/Marketplace/SealedProductsPreview";
import SetCard from "@/components/Marketplace/SetCard";
import { H1, H2 } from "@/components/Shared/Titles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplaceHome } from "@/hooks/useMarketplace";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/utils/price";

export default function MarketplaceHomePage() {
  const {
    popularCards,
    trendingCards,
    bestSellers,
    sets,
    recentListings,
    loadingPopular,
    loadingTrending,
    loadingSellers,
    loadingSets,
    loadingRecentListings,
  } = useMarketplaceHome();

  return (
    <PageWrapper gradient="secondary">
      <div className="space-y-12">
        <MarketplaceBreadcrumb />
        <div className="text-center space-y-4">
          <H1 className="text-4xl md:text-5xl font-bold" variant="primary">
            Marketplace TCG Nexus
          </H1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez, achetez et vendez vos cartes Pokémon. Trouvez les
            meilleures offres et les meilleurs vendeurs de la communauté.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-6">
            <Button asChild size="lg">
              <Link href="/marketplace/cards">
                Explorer les cartes
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/marketplace/sealed">
                Produits scellés
                <Package className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/marketplace/create">Vendre une carte</Link>
            </Button>
          </div>
        </div>

        {/* Layout en deux colonnes pour les écrans larges */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Colonne Principale (Gauche - 3/4) */}
          <div className="lg:col-span-3 space-y-12">
            {/* Cartes tendances */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Flame className="w-6 h-6 text-primary" />
                  <H2>Cartes tendances</H2>
                </div>
                <Button variant="ghost" asChild>
                  <Link href="/marketplace/cards?sortBy=popularity">
                    Voir tout <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
              {loadingTrending ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-80" />
                  ))}
                </div>
              ) : trendingCards && trendingCards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {trendingCards.slice(0, 3).map((item) => (
                    <CardCard
                      key={item.card.id}
                      card={item.card}
                      minPrice={item.minPrice}
                      listingCount={item.listingCount}
                      showTrend={true}
                      trendValue={item.trendScore}
                      isTrending={true}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Aucune carte en tendance pour le moment
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Cartes populaires */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Star className="w-6 h-6 text-primary" />
                  <H2>Cartes populaires</H2>
                </div>
                <Button variant="ghost" asChild>
                  <Link href="/marketplace/cards?sortBy=popularity">
                    Voir tout <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
              {loadingPopular ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-80" />
                  ))}
                </div>
              ) : popularCards && popularCards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {popularCards.slice(0, 3).map((item) => (
                    <CardCard
                      key={item.card.id}
                      card={item.card}
                      minPrice={item.minPrice}
                      avgPrice={item.avgPrice}
                      listingCount={item.listingCount}
                      isPopular={true}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Aucune carte populaire pour le moment
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Bannière Produits scellés */}
            <div className="relative overflow-hidden rounded-2xl border bg-linear-to-r from-primary/20 via-secondary/20 to-primary/10 p-8 md:p-10">
              <div className="absolute -right-8 -top-8 opacity-10">
                <Package className="w-48 h-48" />
              </div>
              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wide">
                    <Package className="w-4 h-4" />
                    Marketplace scellé
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold">
                    Boosters, displays, ETB & decks préconstruits
                  </h3>
                  <p className="text-muted-foreground">
                    Toute la collection de produits scellés, avec prix du marché
                    et historique. Achetez auprès de vendeurs de confiance ou
                    mettez vos propres produits en vente.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild size="lg">
                    <Link href="/marketplace/sealed">
                      Parcourir les scellés
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/marketplace/sealed?sortBy=popularity">
                      <Star className="mr-2 w-4 h-4" />
                      Populaires
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Produits scellés (toggle populaires/récents) */}
            <SealedProductsPreview
              defaultMode="popular"
              limit={6}
              gridCols="grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            />

            {/* Sets */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-primary" />
                  <H2>Séries et extensions</H2>
                </div>
                <Button variant="ghost" asChild>
                  <Link href="/marketplace/cards">
                    Voir toutes les séries{" "}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
              {loadingSets ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {sets?.slice(0, 8).map((set) => (
                    <SetCard key={set.id} set={set} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Colonne Latérale (Droite - 1/4) */}
          <div className="space-y-8">
            {/* Dernières offres */}
            <Card className="border bg-card/40 backdrop-blur-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  Dernières offres
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {loadingRecentListings ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <Skeleton className="w-12 h-16 rounded-md" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))
                ) : recentListings?.data && recentListings.data.length > 0 ? (
                  recentListings.data.map((listing) => {
                    const isCard = listing.productKind === "card";
                    const productName = isCard
                      ? listing.pokemonCard?.name
                      : listing.sealedProduct?.nameEn;
                    const productSetName = isCard
                      ? listing.pokemonCard?.set?.name
                      : listing.sealedProduct?.pokemonSet?.name;
                    const productImage = isCard
                      ? listing.pokemonCard?.image
                      : listing.sealedProduct?.image;
                    const productLink = isCard
                      ? `/marketplace/cards/${listing.pokemonCard?.id}`
                      : `/marketplace/sealed/${listing.sealedProduct?.id}`;

                    return (
                      <Link
                        key={listing.id}
                        href={productLink}
                        className="flex gap-3 items-start group hover:bg-accent/50 p-2 rounded-lg transition-all duration-200 border border-transparent hover:border-border"
                      >
                        <div className="relative w-12 h-16 bg-accent/40 rounded flex items-center justify-center overflow-hidden shrink-0 border border-border/40">
                          {productImage ? (
                            <img
                              src={productImage}
                              alt={productName || ""}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                            {productName}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {productSetName}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs font-bold text-primary">
                              {formatPrice(listing.price, listing.currency)}
                            </span>
                            {isCard && listing.cardState && (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1 font-medium bg-background/50"
                              >
                                {listing.cardState}
                              </Badge>
                            )}
                            {!isCard && listing.sealedCondition && (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1 font-medium bg-background/50"
                              >
                                {listing.sealedCondition}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune offre récente
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Meilleurs vendeurs */}
            <Card className="border bg-card/40 backdrop-blur-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Meilleurs vendeurs
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {loadingSellers ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))
                ) : bestSellers && bestSellers.length > 0 ? (
                  bestSellers.slice(0, 5).map((seller) => (
                    <Link
                      key={seller.seller.id}
                      href={`/marketplace/sellers/${seller.seller.id}`}
                      className="flex gap-3 items-center p-2 rounded-lg hover:bg-accent/50 transition-all duration-200 border border-transparent hover:border-border group"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-accent shrink-0 relative flex items-center justify-center border border-border/60">
                        {seller.seller.avatarUrl ? (
                          <img
                            src={seller.seller.avatarUrl}
                            alt={seller.seller.firstName || ""}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold uppercase">
                            {seller.seller.firstName?.[0]}
                            {seller.seller.lastName?.[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                          {seller.seller.firstName} {seller.seller.lastName}
                          {seller.seller.isPro && (
                            <Badge className="text-[9px] py-0 px-1 uppercase tracking-wider scale-90 bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold">
                              PRO
                            </Badge>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {seller.totalSales} vente
                          {seller.totalSales > 1 ? "s" : ""}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun vendeur pour le moment
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
