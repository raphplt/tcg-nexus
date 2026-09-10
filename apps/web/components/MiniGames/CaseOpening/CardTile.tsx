"use client";

import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/ui/SmartImage";
import { type BoosterCard, RarityTier } from "@/types/mini-game";
import { getCardImage } from "@/utils/images";
import {
  cardValue,
  isHit,
  TIER_BADGE_CLASSES,
  TIER_LABEL_KEYS,
} from "@/utils/miniGames/booster";
import { isCardImagePreloaded } from "@/utils/miniGames/cardPreloader";
import { formatEuro } from "@/utils/miniGames/pricing";

const CARD_BACK = "/images/carte-pokemon-dos.jpg";

interface CardTileProps {
  card: BoosterCard;
  size?: "sm" | "md";
}

/** One revealed card with its tier and market value. Hits glow. */
export function CardTile({ card, size = "md" }: CardTileProps) {
  const t = useTranslations("CaseOpening");
  const locale = useLocale();
  const tier = card.rarityTier ?? RarityTier.Common;
  const hit = isHit(card);

  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-card shadow-sm ${
        hit
          ? "border-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.35)]"
          : "border-border"
      }`}
    >
      <div
        className={`relative ${size === "sm" ? "aspect-5/7 w-17" : "aspect-5/7 w-full"}`}
      >
        <SmartImage
          src={getCardImage(card, "low")}
          alt={card.name ?? ""}
          fallbackSrc={CARD_BACK}
          noSkeleton={isCardImagePreloaded(getCardImage(card, "low"))}
          className="object-contain"
        />
      </div>
      {size === "md" ? (
        <div className="space-y-1 p-2 text-center">
          <p className="truncate text-[10px] font-semibold text-foreground">
            {card.name ?? ""}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <Badge
              className={`border px-1.5 py-0 text-[9px] ${TIER_BADGE_CLASSES[tier]}`}
            >
              {t(TIER_LABEL_KEYS[tier])}
            </Badge>
            <Badge className="border bg-zinc-800 px-1.5 py-0 font-mono text-[9px] text-white">
              {formatEuro(cardValue(card), locale)}
            </Badge>
          </div>
        </div>
      ) : (
        <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center font-mono text-[8px] text-white">
          {formatEuro(cardValue(card), locale)}
        </span>
      )}
    </div>
  );
}
