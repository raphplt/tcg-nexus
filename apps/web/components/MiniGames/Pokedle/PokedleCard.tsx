"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Sparkles } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PokemonCardType } from "@/types/cardPokemon";
import { getCardImage } from "@/utils/images";
import { getOfficialArtworkUrl } from "./pokedleLogic";

interface PokedleCardProps {
  card: PokemonCardType | null;
  isRevealed: boolean;
  guessCount: number;
  maxGuesses?: number;
}

/**
 * Mystery card display component for Pokedle.
 * Completely conceals the card title during gameplay and animates a 3D reveal on game end.
 */
export function PokedleCard({
  card,
  isRevealed,
  guessCount,
  maxGuesses = 6,
}: PokedleCardProps) {
  const t = useTranslations("Pokedle");

  // Keep a safe floor blur of 14px during active gameplay to prevent any text readability
  const safeBlur = isRevealed ? 0 : Math.max(14, 28 - guessCount * 2.5);
  const dexId = card?.dexId?.[0];
  const officialArtwork = getOfficialArtworkUrl(dexId);
  const cardImage = card ? getCardImage(card) : "/images/carte-pokemon-dos.jpg";

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-64 mx-auto">
      <Card className="tcg-surface relative overflow-hidden w-full shadow-lg border-2 border-primary/20 transition-all duration-300">
        <CardContent className="p-4 flex flex-col items-center justify-center relative aspect-[5/7] bg-gradient-to-b from-zinc-900/10 to-zinc-900/40 dark:from-zinc-950/40 dark:to-zinc-950/80">
          <div className="absolute inset-0 bg-[radial-gradient(#3b82f615_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />

          {/* Mystery Spoiler Concealment Header */}
          <AnimatePresence>
            {!isRevealed && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute top-3 inset-x-3 z-30 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-zinc-900/90 dark:bg-zinc-950/95 backdrop-blur-md border border-primary/40 shadow-md text-primary"
              >
                <HelpCircle className="h-3.5 w-3.5 animate-pulse" />
                <span className="text-[11px] font-black tracking-widest uppercase select-none">
                  {t("whoIsThis")}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card Image / Artwork */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-md">
            {card && (
              <motion.div
                key={isRevealed ? "revealed" : "mystery"}
                initial={{ scale: 0.95, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="relative w-full h-full"
              >
                <SmartImage
                  src={cardImage}
                  alt={isRevealed ? (card.name ?? t("cardRevealed")) : t("mysteryCard")}
                  fallbackSrc={officialArtwork}
                  className="w-full h-full object-contain transition-all duration-700 ease-out"
                  style={{
                    filter: isRevealed
                      ? "none"
                      : `blur(${safeBlur}px) saturate(0.85) contrast(1.05)`,
                  }}
                />

                {/* Holographic sparkle overlay on reveal */}
                {isRevealed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none"
                  />
                )}
              </motion.div>
            )}
          </div>

          {/* Revealed Banner Details */}
          <AnimatePresence>
            {isRevealed && card && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-3 inset-x-3 z-30 p-2 rounded-md bg-background/95 backdrop-blur-md border border-border shadow-lg flex flex-col items-center text-center gap-1"
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-black text-foreground">
                    {card.name}
                  </span>
                  {dexId && (
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      #{dexId}
                    </span>
                  )}
                </div>
                {card.set?.name && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[90%]">
                    {card.set.name}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Footer Status Badge */}
      <Badge
        variant={isRevealed ? "default" : "outline"}
        className="text-[11px] font-bold border-border/80 px-3 py-1"
      >
        {isRevealed
          ? t("cardRevealed")
          : t("guessCount", { current: guessCount, max: maxGuesses })}
      </Badge>
    </div>
  );
}
