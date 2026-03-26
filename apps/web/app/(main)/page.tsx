"use client";

import React from "react";
import Link from "next/link";
import TournamentPreview from "@/components/Home/TournamentPreview";
import MarketplacePreview from "@/components/Home/MarketplacePreview";
import LatestArticles from "@/components/Home/LatestArticles";
import RandomCard from "@/components/Home/RandomCard";
import TrendingDecks from "@/components/Home/TrendingDecks";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LibraryBig } from "lucide-react";

const HomePage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isLoggedIn = !isLoading && isAuthenticated && user;
  const userFirstName = user?.firstName ?? "Dresseur";

  return (
    <div className="min-h-screen bg-linear-to-br from-muted via-background to-accent/20">
      <section className="relative overflow-hidden border-b-4 border-border bg-linear-to-r from-primary/10 via-background to-secondary/10">
        <div className="bg-grid-pattern absolute inset-0 opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {isLoggedIn ? (
                <>
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-heading tracking-tight text-foreground">
                    Bon retour,{" "}
                    <span className="text-primary">{userFirstName}</span> !
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-xl">
                    Votre espace est prêt: suivez vos tournois, mettez à jour
                    votre collection et gérez vos decks en quelques clics.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Button asChild size="lg" className="text-lg px-8 py-6">
                      <Link href="/dashboard">
                        Aller au dashboard
                        <LayoutDashboard className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="text-lg px-8 py-6"
                    >
                      <Link href="/collection">
                        Voir ma collection
                        <LibraryBig className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-heading tracking-tight text-foreground">
                    La plateforme{" "}
                    <span className="text-primary">ultime</span> pour les
                    joueurs Pokemon TCG
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-xl">
                    Gerez vos collections, participez a des tournois, achetez
                    et vendez sur le marketplace. Tout en un seul endroit.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Button asChild size="lg" className="text-lg px-8 py-6">
                      <Link href="/marketplace">Explorer le Marketplace</Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="text-lg px-8 py-6"
                    >
                      <Link href="/tournaments">Voir les tournois</Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div className="hidden lg:block">
              <RandomCard />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div className="card-hover">
                <TournamentPreview />
              </div>
              <div className="card-hover lg:hidden">
                <RandomCard />
              </div>
            </div>
            <div className="space-y-8">
              <div className="card-hover">
                <MarketplacePreview />
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TrendingDecks />
          <LatestArticles />
        </section>
      </main>
    </div>
  );
};

export default HomePage;
