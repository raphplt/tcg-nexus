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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 pt-20">
        <section className="flex flex-col gap-8 lg:col-span-1">
          <TournamentPreview />
          <RandomCard />
        </section>
        <section className="flex flex-col gap-8 lg:col-span-1">
          <MarketplacePreview />
          <TrendingDecks />
          {/* <MyCollection /> */}
        </section>
        <section className="flex flex-col gap-8 lg:col-span-1">
          <StrategicToolsPreview />
          <LatestArticles />
        </section>
      </main>
    </div>
  );
};

export default HomePage;
