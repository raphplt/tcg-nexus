"use client";

import React from "react";
import { Brain, Spade, Trophy, LogIn, UserPlus } from "lucide-react";
import CardLink from "@components/Layout/CardLink";
import RandomPokemon from "@components/RandomPokemon";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// TODO: Supprimer ce fichier si on a pas besoin de l'ancienne page d'accueil
const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_#0f172a,_#1e3a8a,_#991b1b)] text-background">
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
                variant="default"
              >
                <Link href="/dashboard">Accéder au Dashboard</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                asChild
                variant="outline"
                className="bg-primary"
              >
                <Link href="/auth/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Se connecter
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="bg-secondary"
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

        <RandomPokemon />
      </div>
    </div>
  );
};

export default HomePage;
