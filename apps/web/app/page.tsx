"use client";

import React from "react";
import { Brain, Spade, Trophy, LogIn, UserPlus } from "lucide-react";
import CardLink from "@components/Layout/CardLink";
import RandomPokemon from "@components/RandomPokemon";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-l from-[#4b6cb7] to-[#182848] text-white">
      <div className="container mx-auto px-4 py-20">
        {/* Section Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Bienvenue sur TCG Nexus
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            La révolution du jeu de cartes à collectionner
          </p>

          {isAuthenticated && user ? (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                Bon retour, {user.firstName} ! 👋
              </h2>
              <Button
                asChild
                className="bg-white text-[#182848] hover:bg-gray-100"
              >
                <Link href="/dashboard">Accéder au Dashboard</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                asChild
                className="bg-white text-[#182848] hover:bg-gray-100"
              >
                <Link href="/auth/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Se connecter
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-[#182848]"
              >
                <Link href="/auth/register">
                  <UserPlus className="mr-2 h-4 w-4" />
                  S&apos;inscrire
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Section Cards */}
        <div className="flex flex-wrap justify-center items-center gap-4 mb-16">
          <CardLink
            title="Tournois"
            description="Retrouvez tous les tournois organisés par la communauté."
            icon={<Trophy />}
            link="/tournaments"
          />

          <CardLink
            title="Marketplace"
            description="Achetez et vendez des cartes Pokémon."
            icon={<Spade />}
            link="/marketplace"
          />

          <CardLink
            title="Stratégie"
            description="Découvrez les meilleures stratégies pour gagner vos combats."
            icon={<Brain />}
            link="/strategy"
          />
        </div>

        {/* Section Pokémon et liens */}
        <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
          <p className="text-lg">Autres liens</p>
          <ul className="space-y-2">
            <li>
              <Link
                href="/pokemon"
                className="text-white hover:underline text-lg"
              >
                Pokémon
              </Link>
            </li>
          </ul>
        </div>

        <RandomPokemon />
      </div>
    </div>
  );
};

export default HomePage;
