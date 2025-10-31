"use client";

import { useQuery } from "@tanstack/react-query";
import { H1, H2 } from "@/components/Shared/Titles";
import { CardCard } from "@/components/Marketplace/CardCard";
import { SellerCard } from "@/components/Marketplace/SellerCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { marketplaceService } from "@/services/marketplace.service";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { ArrowRight, Flame, TrendingUp, Star, Package } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
import SetCard from "@/components/Marketplace/SetCard";

export default function MarketplaceHomePage() {
  // Récupère les cartes populaires
  const { data: popularCards, isLoading: loadingPopular } = useQuery({
    queryKey: ["marketplace", "popular"],
    queryFn: () => marketplaceService.getPopularCards(8),
  });

  // Récupère les cartes en tendance
  const { data: trendingCards, isLoading: loadingTrending } = useQuery({
    queryKey: ["marketplace", "trending"],
    queryFn: () => marketplaceService.getTrendingCards(8, true),
  });

  // Récupère les meilleurs vendeurs
  const { data: bestSellers, isLoading: loadingSellers } = useQuery({
    queryKey: ["marketplace", "best-sellers"],
    queryFn: () => marketplaceService.getBestSellers(6),
  });

  // Récupère les séries
  const { data: series, isLoading: loadingSeries } = useQuery({
    queryKey: ["pokemon-series"],
    queryFn: () => pokemonCardService.getAllSeries(),
  });

  // Récupère les sets
  const { data: sets, isLoading: loadingSets } = useQuery({
    queryKey: ["pokemon-sets"],
    queryFn: () => pokemonCardService.getAllSets(),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        <MarketplaceBreadcrumb />
        <div className="text-center space-y-4">
          <H1
            className="text-4xl md:text-5xl font-bold"
            variant="primary"
          >
            Marketplace TCG Nexus
          </H1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez, achetez et vendez vos cartes Pokémon. Trouvez les
            meilleures offres et les meilleurs vendeurs de la communauté.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-6">
            <Button
              asChild
              size="lg"
            >
              <Link href="/marketplace/cards">
                Explorer les cartes
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
            >
              <Link href="/marketplace/create">Vendre une carte</Link>
            </Button>
          </div>
        </div>

        {/* Section des cartes en tendance */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Flame className="w-6 h-6 text-primary" />
              <H2>Cartes en tendance</H2>
            </div>
            <Button
              variant="ghost"
              asChild
            >
              <Link href="/marketplace/cards?sortBy=popularity">
                Voir tout <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          {loadingTrending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-80"
                />
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

        {/* Section des cartes populaires */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-primary" />
              <H2>Cartes populaires</H2>
            </div>
            <Button
              variant="ghost"
              asChild
            >
              <Link href="/marketplace/cards?sortBy=popularity">
                Voir tout <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          {loadingPopular ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-80"
                />
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

        {/* Section des meilleurs vendeurs */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" />
              <H2>Meilleurs vendeurs</H2>
            </div>
            <Button
              variant="ghost"
              asChild
            >
              <Link href="/marketplace/cards">
                Voir tout <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          {loadingSellers ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-24"
                />
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

        {/* Section des séries et extensions */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-primary" />
              <H2>Séries et extensions</H2>
            </div>
            <Button
              variant="ghost"
              asChild
            >
              <Link href="/marketplace/cards">
                Voir toutes les séries <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          {loadingSeries || loadingSets ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-32"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {sets?.slice(0, 12).map((set) => (
                <SetCard
                  key={set.id}
                  set={set}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
