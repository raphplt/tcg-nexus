"use client";

import React from "react";
import TournamentPreview from "@/components/Home/TournamentPreview";
import MarketplacePreview from "@/components/Home/MarketplacePreview";
import StrategicToolsPreview from "@/components/Home/StrategicToolsPreview";
import LatestArticles from "@/components/Home/LatestArticles";
import RandomCard from "@/components/Home/RandomCard";
import TrendingDecks from "@/components/Home/TrendingDecks";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-background to-accent/20">
      <section className="relative overflow-hidden border-b-4 border-black bg-gradient-to-r from-primary/10 via-background to-secondary/10">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Bienvenue sur <span className="text-primary">TCG Nexus</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Votre plateforme complète pour le trading de cartes Pokémon, les
              tournois et l'analyse stratégique
            </p>
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
              <div className="card-hover">
                <RandomCard />
              </div>
            </div>
            <div className="space-y-8">
              <div className="card-hover">
                <MarketplacePreview />
              </div>
              <div className="card-hover">
                <StrategicToolsPreview />
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
