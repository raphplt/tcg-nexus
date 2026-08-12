"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Gamepad,
  Gamepad2,
  Heart,
  HelpCircle,
  Layers,
  Package,
  Sparkles,
  Swords,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import React from "react";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface GameInfo {
  id: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  modes: ("Solo" | "Local" | "En ligne")[];
  featureCount: number;
}

const MINI_GAMES: GameInfo[] = [
  {
    id: "smash_or_pass",
    href: "/pokemon/mini-games/smash-or-pass",
    icon: Heart,
    modes: ["Solo"],
    featureCount: 3,
  },
  {
    id: "case_opening",
    href: "/pokemon/mini-games/case-opening",
    icon: Package,
    modes: ["Solo", "Local", "En ligne"],
    featureCount: 3,
  },
  {
    id: "juste_prix",
    href: "/pokemon/mini-games/juste-prix",
    icon: Sparkles,
    modes: ["Solo", "Local", "En ligne"],
    featureCount: 3,
  },
  {
    id: "pokedle",
    href: "/pokemon/mini-games/pokedle",
    icon: Layers,
    modes: ["Solo"],
    featureCount: 3,
  },
  {
    id: "whos_that_pokemon",
    href: "/pokemon/mini-games/whos-that-pokemon",
    icon: HelpCircle,
    modes: ["Solo"],
    featureCount: 3,
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
  const t = useTranslations("MiniGames");
  return (
    <PageWrapper maxWidth="xl" gradient="secondary" className="space-y-6">
      <Card className="tcg-surface tcg-surface--hero border-border">
        <CardContent className="space-y-4 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {t("eyebrow")}
              </p>
              <h1 className="text-3xl font-black leading-tight text-foreground md:text-[2.5rem]">
                {t("title")}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                {t("subtitle")}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-foreground">
              <Gamepad2 className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12"
      >
        {MINI_GAMES.map((game) => {
          const Icon = game.icon;
          return (
            <motion.div key={game.id} variants={cardVariants}>
              <Card className="tcg-surface tcg-surface--hover h-full flex flex-col justify-between overflow-hidden">
                <CardContent className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {game.modes.map((mode) => (
                          <Badge
                            key={
                              mode === "En ligne"
                                ? t("modeOnline")
                                : mode === "Local"
                                  ? t("modeLocal")
                                  : t("modeSolo")
                            }
                            variant="secondary"
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              mode === "En ligne"
                                ? "bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                : mode === "Local"
                                  ? "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                  : "bg-muted text-muted-foreground border border-border/50"
                            }`}
                          >
                            {mode === "En ligne" && (
                              <Swords className="h-2 w-2 mr-1 inline" />
                            )}
                            {mode === "Local" && (
                              <Gamepad className="h-2 w-2 mr-1 inline" />
                            )}
                            {mode === "En ligne"
                              ? t("modeOnline")
                              : mode === "Local"
                                ? t("modeLocal")
                                : t("modeSolo")}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {t(`games.${game.id}.title`)}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t(`games.${game.id}.description`)}
                      </p>
                    </div>

                    <ul className="space-y-1 pt-1">
                      {Array.from({ length: game.featureCount }).map(
                        (_, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/45" />
                            {t(`games.${game.id}.feature${idx + 1}`)}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  <div className="pt-5">
                    <Button
                      asChild
                      className="w-full font-semibold shadow-sm hover:shadow transition-all duration-300"
                    >
                      <Link href={game.href}>
                        {t("playNow")}
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
