"use client";

import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/ui/SmartImage";
import { cn } from "@/lib/utils";
import { type BoosterCard, RarityTier } from "@/types/mini-game";
import { getCardImage } from "@/utils/images";
import {
  cardValue,
  isHit,
  TIER_BADGE_CLASSES,
  TIER_LABEL_KEYS,
} from "@/utils/miniGames/booster";
import { formatEuro } from "@/utils/miniGames/pricing";

const CARD_BACK = "/images/carte-pokemon-dos.jpg";

interface CardTileProps {
  card: BoosterCard;
  size?: "xs" | "sm" | "md";
  className?: string;
}

/** One revealed card with its tier and market value. Hits glow. */
export function CardTile({ card, size = "md", className }: CardTileProps) {
  const t = useTranslations("CaseOpening");
  const locale = useLocale();
  const tier = card.rarityTier ?? RarityTier.Common;
  const hit = isHit(card);

  return (
    <div
      title={`${card.name ?? ""} • ${t(TIER_LABEL_KEYS[tier])} • ${formatEuro(cardValue(card), locale)}`}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card shadow-sm transition-transform duration-150 hover:scale-105",
        hit
          ? "border-amber-400/60 shadow-[0_0_14px_rgba(251,191,36,0.3)] ring-1 ring-amber-400/30"
          : "border-border",
        className,
      )}
    >
      <div className="relative aspect-5/7 w-full">
        <SmartImage
          src={getCardImage(card, "low")}
          alt={card.name ?? ""}
          fallbackSrc={CARD_BACK}
          noSkeleton
          loading="eager"
          className="object-contain"
        />
        {size !== "md" && hit && (
          <span
            className="absolute top-1 right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-amber-400 shadow-sm ring-1 ring-amber-950/50"
            aria-label={t("hit")}
          >
            <span className="h-1 w-1 rounded-full bg-amber-950" />
          </span>
        )}
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
        <span
          className={cn(
            "absolute inset-x-0 bottom-0 bg-black/75 backdrop-blur-[1px] text-center font-mono font-medium text-white truncate px-0.5",
            size === "xs" ? "py-0.2 text-[8px] leading-tight" : "py-0.5 text-[9px]",
          )}
        >
          {formatEuro(cardValue(card), locale)}
        </span>
      )}
    </div>
  );
}
