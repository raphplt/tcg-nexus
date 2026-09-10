"use client";

import { motion } from "framer-motion";
import { HelpCircle, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { PokemonCardType } from "@/types/cardPokemon";
import { getCardImage, getRarityImage } from "@/utils/images";
import {
  type DifficultyConfig,
  getPokemonOfficialArtwork,
  getTypeAura,
} from "./whosThatPokemonLogic";

interface WhosThatPokemonCardProps {
  card: PokemonCardType | null;
  revealed: boolean;
  timeLeft: number;
  cfg: DifficultyConfig | null;
}

/**
 * Mystery card and Pokémon stadium display for Who's That Pokémon.
 *
 * During the guessing phase, the Pokémon is rendered against a stylized
 * Pokéball arena. Depending on the selected difficulty:
 * - Easy: Full-color official artwork with a subtle decreasing blur.
 * - Medium: Silhouette surrounded by an elemental aura matching its energy type.
 * - Hard: Classic anime dark silhouette with high contrast.
 *
 * Upon reveal, the full authentic TCG card is presented with its set logo and rarity.
 */
export function WhosThatPokemonCard({
  card,
  revealed,
  timeLeft,
  cfg,
}: WhosThatPokemonCardProps) {
  const t = useTranslations("WhosThatPokemon");
  const [viewMode, setViewMode] = useState<"card" | "art">("card");
  const [cardLoaded, setCardLoaded] = useState(false);

  const cardImg =
    (card ? getCardImage(card) : null) || "/images/carte-pokemon-dos.jpg";

  const primaryDexId = card?.dexId?.[0];
  const officialArtUrl = getPokemonOfficialArtwork(primaryDexId);
  const primaryType = card?.types?.[0];
  const typeAura = getTypeAura(primaryType);

  // Preload full card image in background during guessing phase
  useEffect(() => {
    setCardLoaded(false);
    if (
      typeof window !== "undefined" &&
      cardImg &&
      cardImg !== "/images/carte-pokemon-dos.jpg"
    ) {
      const preload = new window.Image();
      preload.onload = () => setCardLoaded(true);
      preload.src = cardImg;
    }
  }, [cardImg]);

  const blurNow =
    cfg && cfg.visualMode === "blur"
      ? cfg.minBlur +
        (cfg.baseBlur - cfg.minBlur) * (Math.max(0, timeLeft) / cfg.time)
      : 0;

  // Mystery filter applied to the artwork during the guessing phase
  let mysteryStyle: React.CSSProperties = {};
  if (cfg?.visualMode === "silhouette") {
    mysteryStyle = {
      filter:
        "brightness(0) drop-shadow(0 4px 14px rgba(0,0,0,0.45)) drop-shadow(0 0 2px rgba(255,255,255,0.35))",
    };
  } else if (cfg?.visualMode === "silhouette-glow") {
    mysteryStyle = {
      filter: `brightness(0) drop-shadow(0 0 12px ${typeAura}) drop-shadow(0 0 22px ${typeAura}80)`,
    };
  } else if (cfg?.visualMode === "blur") {
    mysteryStyle = {
      filter: `blur(${blurNow.toFixed(1)}px) brightness(${cfg?.brightness ?? 0.95}) saturate(1.1)`,
    };
  }

  const mysteryImgSrc = officialArtUrl || cardImg;

  return (
    <div className="relative flex w-full max-w-72 shrink-0 flex-col items-center justify-center">
      {/* Stadium Container */}
      <div className="relative flex aspect-[5/7] w-full flex-col items-center justify-between overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card/95 to-muted/40 p-3 shadow-lg dark:border-border/50 dark:from-zinc-900/90 dark:to-zinc-950">
        {/* Pokéball background watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.06] dark:opacity-[0.08]">
          <div className="relative h-64 w-64 rounded-full border-[18px] border-foreground">
            <div className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 bg-foreground" />
            <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-[12px] border-foreground bg-card" />
          </div>
        </div>

        {/* Ambient colored lighting behind Pokémon */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20 transition-all duration-700"
          style={{
            background: `radial-gradient(circle at center, ${typeAura} 0%, transparent 70%)`,
          }}
        />

        {revealed ? (
          /* Revealed View: The Real TCG Card & Expansion details */
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative flex h-full w-full flex-col items-center justify-between py-1"
          >
            {/* View Switcher (Card vs Artwork) */}
            {officialArtUrl && (
              <div className="z-10 mb-1 flex items-center gap-1 rounded-full border border-border/60 bg-muted/60 p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`rounded-full px-2.5 py-0.5 transition-all ${
                    viewMode === "card"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Carte TCG
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("art")}
                  className={`rounded-full px-2.5 py-0.5 transition-all ${
                    viewMode === "art"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Illustration
                </button>
              </div>
            )}

            {/* Display Target */}
            <div className="relative flex flex-1 w-full items-center justify-center overflow-hidden p-1">
              {viewMode === "card" ? (
                <>
                  {!cardLoaded && officialArtUrl && (
                    <img
                      src={officialArtUrl}
                      alt={card?.name || t("mysteryCardAlt")}
                      className="absolute inset-0 m-auto max-h-[85%] max-w-[85%] object-contain opacity-60 animate-pulse"
                    />
                  )}
                  <img
                    src={cardImg}
                    alt={card?.name || t("mysteryCardAlt")}
                    loading="eager"
                    decoding="async"
                    onLoad={() => setCardLoaded(true)}
                    className={cn(
                      "h-full w-full select-none object-contain drop-shadow-xl transition-opacity duration-300",
                      cardLoaded ? "opacity-100" : "opacity-0",
                    )}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== "/images/carte-pokemon-dos.jpg") {
                        target.src = "/images/carte-pokemon-dos.jpg";
                      }
                      setCardLoaded(true);
                    }}
                  />
                </>
              ) : (
                <img
                  src={officialArtUrl!}
                  alt={card?.name || t("mysteryCardAlt")}
                  loading="eager"
                  decoding="async"
                  className="h-full w-full select-none object-contain drop-shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95"
                />
              )}
            </div>

            {/* Expansion and Rarity Footnote */}
            <div className="mt-1 flex items-center justify-center gap-2 text-[11px] font-semibold text-muted-foreground">
              <span>{card?.set?.name || t("unknownExpansion")}</span>
              {card?.rarity && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    {getRarityImage(card.rarity) && (
                      <img
                        src={getRarityImage(card.rarity)}
                        alt={card.rarity}
                        className="h-3 w-3 object-contain"
                      />
                    )}
                    <span>{card.rarity}</span>
                  </span>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          /* Guessing View: Authentic Silhouette or Blur in Pokéball Arena */
          <div className="relative flex h-full w-full flex-col items-center justify-between py-2">
            {/* Mystery Top Badge */}
            <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-foreground shadow-xs backdrop-blur-xs">
              <HelpCircle className="h-3 w-3 text-primary animate-pulse" />
              <span>{t("title")}</span>
            </div>

            {/* The Mystery Pokémon Figure */}
            <div className="relative flex flex-1 w-full items-center justify-center p-3">
              <img
                src={mysteryImgSrc}
                alt={t("mysteryCardAlt")}
                loading="eager"
                decoding="async"
                style={mysteryStyle}
                className="max-h-[82%] max-w-[86%] select-none object-contain transition-all duration-300 pointer-events-none drop-shadow-md"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== cardImg) {
                    target.src = cardImg;
                  }
                }}
              />
            </div>

            {/* Bottom Arena Caption */}
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>{t("mysteryCardAlt")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
