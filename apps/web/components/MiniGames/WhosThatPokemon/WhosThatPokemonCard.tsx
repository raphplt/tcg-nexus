"use client";

import { useTranslations } from "next-intl";
import { SmartImage } from "@/components/ui/SmartImage";
import type { PokemonCardType } from "@/types/cardPokemon";
import { getCardImage } from "@/utils/images";
import type { DifficultyConfig } from "./whosThatPokemonLogic";

interface WhosThatPokemonCardProps {
  card: PokemonCardType | null;
  revealed: boolean;
  timeLeft: number;
  cfg: DifficultyConfig | null;
}

/**
 * Mystery card display for Who's That Pokémon.
 *
 * During the guessing phase, the card is cropped to its artwork window so that
 * the printed Pokémon name is never visible to the player. In hard mode, it
 * displays as a dark silhouette; in easy and medium modes, as a blurred illustration.
 * Upon reveal, the full card is shown with normal filtering and its expansion name.
 */
export function WhosThatPokemonCard({
  card,
  revealed,
  timeLeft,
  cfg,
}: WhosThatPokemonCardProps) {
  const t = useTranslations("WhosThatPokemon");
  const cardImg =
    (card ? getCardImage(card) : null) || "/images/carte-pokemon-dos.jpg";

  const blurNow =
    cfg && cfg.visualMode === "blur"
      ? cfg.minBlur +
        (cfg.baseBlur - cfg.minBlur) * (Math.max(0, timeLeft) / cfg.time)
      : 0;

  const mysteryFilter =
    cfg?.visualMode === "silhouette"
      ? "brightness(0.04) contrast(250%)"
      : `blur(${blurNow.toFixed(1)}px) brightness(${cfg?.brightness ?? 0.6}) saturate(1.15)`;

  return (
    <div className="relative flex w-full max-w-72 shrink-0 flex-col items-center justify-center">
      <div className="relative flex aspect-[5/7] w-full items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-zinc-950/30 p-2 shadow-inner dark:bg-zinc-950/60">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:12px_12px]" />

        {revealed ? (
          <div className="relative flex h-full w-full items-center justify-center transition-all duration-500">
            <SmartImage
              src={cardImg}
              alt={card?.name || t("mysteryCardAlt")}
              fallbackSrc="/images/carte-pokemon-dos.jpg"
              className="h-full w-full object-contain drop-shadow-md"
            />
          </div>
        ) : (
          <div className="relative flex h-full w-full flex-col items-center justify-center">
            {/* Cropped illustration viewport: hides name bar and attacks */}
            <div className="relative aspect-[4/3] w-[90%] overflow-hidden rounded-xl border border-border/40 bg-zinc-900/80 shadow-md">
              <SmartImage
                src={cardImg}
                alt={t("mysteryCardAlt")}
                fallbackSrc="/images/carte-pokemon-dos.jpg"
                className="h-full w-full scale-[2.1] select-none object-cover object-[center_32%] transition-all duration-300 pointer-events-none"
                style={{ filter: mysteryFilter }}
              />
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {t("mysteryCardAlt")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
