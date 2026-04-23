"use client";

import { ArrowRight, Flame, Package, Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { CardCard } from "@/components/Marketplace/CardCard";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
import { SealedProductsPreview } from "@/components/Marketplace/SealedProductsPreview";
import { SellerCard } from "@/components/Marketplace/SellerCard";
import SetCard from "@/components/Marketplace/SetCard";
import { H1, H2 } from "@/components/Shared/Titles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplaceHome } from "@/hooks/useMarketplace";

export default function MarketplaceHomePage() {
  const {
    popularCards,
    trendingCards,
    bestSellers,
    sets,
    loadingPopular,
    loadingTrending,
    loadingSellers,
    loadingSets,
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </div>
          ) : trendingCards && trendingCards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {trendingCards.slice(0, 4).map((item) => (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </div>
          ) : popularCards && popularCards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {popularCards.slice(0, 4).map((item) => (
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

        {/* Meilleurs vendeurs */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" />
              <H2>Meilleurs vendeurs</H2>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/marketplace/cards">
                Voir tout <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          {loadingSellers ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : bestSellers && bestSellers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {bestSellers.map((seller) => (
                <SellerCard
                  key={seller.seller.id}
                  seller={seller.seller}
                  totalSales={seller.totalSales}
                  totalRevenue={seller.totalRevenue}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun vendeur pour le moment
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
                Toute la collection de produits scellés, avec prix du marché et
                historique. Achetez auprès de vendeurs de confiance ou mettez
                vos propres produits en vente.
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
        <SealedProductsPreview defaultMode="popular" limit={8} />

        {/* Sets */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-primary" />
              <H2>Séries et extensions</H2>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/marketplace/cards">
                Voir toutes les séries <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          {loadingSets ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {sets?.slice(0, 12).map((set) => (
                <SetCard key={set.id} set={set} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
