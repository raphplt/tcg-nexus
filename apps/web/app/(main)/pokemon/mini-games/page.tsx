"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Heart,
  HelpCircle,
  Package,
  Sparkles,
  Gamepad2,
  Gamepad,
  Swords,
  Layers,
  ArrowRight,
} from "lucide-react";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H1, H2 } from "@/components/Shared/Titles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GameInfo {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  modes: ("Solo" | "Local" | "En ligne")[];
  features: string[];
}

const MINI_GAMES: GameInfo[] = [
  {
    id: "smash_or_pass",
    title: "Smash or Pass",
    description: "Parcours des cartes aléatoires et swipe à droite pour les ajouter directement à tes favoris et ta wishlist.",
    href: "/pokemon/mini-games/smash-or-pass",
    icon: Heart,
    modes: ["Solo"],
    features: ["Wishlist directe", "Filtres par série & bloc", "Stats de session"],
  },
  {
    id: "case_opening",
    title: "Duel Case Opening",
    description: "Affronte tes amis ou un ordinateur dans un duel de tirage de boosters Pokémon en ligne ou en local. Que le plus chanceux gagne !",
    href: "/pokemon/mini-games/case-opening",
    icon: Package,
    modes: ["Solo", "Local", "En ligne"],
    features: ["Roulette style CS:GO", "Matchmaking temps réel", "Prix en direct"],
  },
  {
    id: "juste_prix",
    title: "Le Juste Prix",
    description: "Devine le prix exact de cartes rares ou de produits scellés Pokémon. Le joueur le plus précis ou le plus rapide remporte la mise.",
    href: "/pokemon/mini-games/juste-prix",
    icon: Sparkles,
    modes: ["Solo", "Local", "En ligne"],
    features: ["Estimation de cartes", "Produits scellés", "PVP synchrone"],
  },
  {
    id: "pokedle",
    title: "Pokédle",
    description: "Devine le Pokémon mystère de la session en utilisant des indices Wordle (types, génération, HP, évolution) et une carte qui se défloute.",
    href: "/pokemon/mini-games/pokedle",
    icon: Layers,
    modes: ["Solo"],
    features: ["Système d'indices", "Recherche autocomplétée", "Défloutage d'image"],
  },
  {
    id: "whos_that_pokemon",
    title: "Qui est ce Pokémon ?",
    description: "Retrouve la nostalgie du dessin animé ! Identifie le Pokémon caché derrière la silhouette noire de l'illustration avant la fin du chronomètre.",
    href: "/pokemon/mini-games/whos-that-pokemon",
    icon: HelpCircle,
    modes: ["Solo"],
    features: ["Chrono 15 secondes", "Choix multiple", "Révélation de carte"],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export default function MiniGamesHubPage() {
  return (
    <PageWrapper maxWidth="xl" gradient="secondary" className="space-y-6">
      {/* Hero Header */}
      <Card className="tcg-surface tcg-surface--hero border-border">
        <CardContent className="space-y-4 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Découverte
              </p>
              <h1 className="text-3xl font-black leading-tight text-foreground md:text-[2.5rem]">
                Pokémon Mini-Jeux
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                Défie la chance, teste tes connaissances et affronte la communauté en ligne ou tes amis sur le même écran grâce à nos 5 modes de jeux inédits.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-foreground">
              <Gamepad2 className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Games Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {MINI_GAMES.map((game) => {
          const Icon = game.icon;
          return (
            <motion.div key={game.id} variants={cardVariants}>
              <Card className="tcg-surface tcg-surface--hover h-full flex flex-col justify-between overflow-hidden">
                <CardContent className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Top Bar with Icon & Modes */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {game.modes.map((mode) => (
                          <Badge
                            key={mode}
                            variant="secondary"
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              mode === "En ligne"
                                ? "bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                : mode === "Local"
                                  ? "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                  : "bg-muted text-muted-foreground border border-border/50"
                            }`}
                          >
                            {mode === "En ligne" && <Swords className="h-2 w-2 mr-1 inline" />}
                            {mode === "Local" && <Gamepad className="h-2 w-2 mr-1 inline" />}
                            {mode}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-1">
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {game.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {game.description}
                      </p>
                    </div>

                    {/* Bullet points */}
                    <ul className="space-y-1 pt-1">
                      {game.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/45" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action button */}
                  <div className="pt-5">
                    <Button
                      asChild
                      className="w-full font-semibold shadow-sm hover:shadow transition-all duration-300"
                    >
                      <Link href={game.href}>
                        Jouer maintenant
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </PageWrapper>
  );
}
