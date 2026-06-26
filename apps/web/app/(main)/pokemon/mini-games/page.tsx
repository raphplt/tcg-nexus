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
  ArrowLeft,
} from "lucide-react";
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
  color: string;
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
    color: "bg-pink-500 hover:bg-pink-600 text-white",
    modes: ["Solo"],
    features: ["Wishlist directe", "Filtres par série & bloc", "Stats de session"],
  },
  {
    id: "case_opening",
    title: "Duel Case Opening",
    description: "Affronte tes amis ou un ordinateur dans un duel de tirage de boosters Pokémon en ligne ou en local. Que le plus chanceux gagne !",
    href: "/pokemon/mini-games/case-opening",
    icon: Package,
    color: "bg-amber-500 hover:bg-amber-600 text-white",
    modes: ["Solo", "Local", "En ligne"],
    features: ["Roulette style CS:GO", "Matchmaking temps réel", "Prix en direct"],
  },
  {
    id: "juste_prix",
    title: "Le Juste Prix",
    description: "Devine le prix exact de cartes rares ou de produits scellés Pokémon. Le joueur le plus précis ou le plus rapide remporte la mise.",
    href: "/pokemon/mini-games/juste-prix",
    icon: Sparkles,
    color: "bg-emerald-500 hover:bg-emerald-600 text-white",
    modes: ["Solo", "Local", "En ligne"],
    features: ["Estimation de cartes", "Produits scellés", "PVP synchrone"],
  },
  {
    id: "pokedle",
    title: "Pokédle",
    description: "Devine le Pokémon mystère de la session en utilisant des indices Wordle (types, génération, HP, évolution) et une carte qui se défloute.",
    href: "/pokemon/mini-games/pokedle",
    icon: Layers,
    color: "bg-purple-500 hover:bg-purple-600 text-white",
    modes: ["Solo"],
    features: ["Système d'indices", "Recherche autocomplétée", "Défloutage d'image"],
  },
  {
    id: "whos_that_pokemon",
    title: "Qui est ce Pokémon ?",
    description: "Retrouve la nostalgie du dessin animé ! Identifie le Pokémon caché derrière la silhouette noire de l'illustration avant la fin du chronomètre.",
    href: "/pokemon/mini-games/whos-that-pokemon",
    icon: HelpCircle,
    color: "bg-blue-500 hover:bg-blue-600 text-white",
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
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 100 },
  },
};

export default function MiniGamesHubPage() {
  return (
    <div className="min-h-screen bg-background/95 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring" as const, stiffness: 100 }}
            className="inline-flex h-16 w-16 items-center justify-center border-4 border-foreground bg-primary text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4"
          >
            <Gamepad2 className="h-10 w-10" />
          </motion.div>

          <H1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight mb-3">
            Pokémon Mini-Jeux
          </H1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Défie la chance, teste tes connaissances et affronte la communauté en ligne ou tes amis sur le même écran grâce à nos 5 modes de jeux inédits.
          </p>
        </div>

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
                <Card className="h-full border-4 border-foreground bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between overflow-hidden">
                  <CardContent className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Top Bar with Icon & Modes */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className={`p-3 border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${game.color.split(" ")[0]}`}>
                          <Icon className="h-6 w-6 text-foreground" />
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {game.modes.map((mode) => (
                            <Badge
                              key={mode}
                              variant="outline"
                              className={`border-2 border-foreground text-[10px] font-black uppercase px-2 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                                mode === "En ligne"
                                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                                  : mode === "Local"
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-foreground"
                              }`}
                            >
                              {mode === "En ligne" && <Swords className="h-2.5 w-2.5 mr-1 inline" />}
                              {mode === "Local" && <Gamepad className="h-2.5 w-2.5 mr-1 inline" />}
                              {mode}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Info */}
                      <h3 className="font-heading text-xl font-bold uppercase tracking-tight text-foreground mb-2">
                        {game.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        {game.description}
                      </p>

                      {/* Bullet points */}
                      <ul className="space-y-1.5 mb-6">
                        {game.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                            <span className="h-1.5 w-1.5 bg-primary border border-foreground rounded-full" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action button */}
                    <Link href={game.href} passHref className="w-full">
                      <Button
                        className={`w-full border-2 border-foreground shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] font-black uppercase text-sm h-11 tracking-wider ${game.color}`}
                      >
                        Jouer maintenant
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
