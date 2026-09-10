"use client";

import { useLocale, useTranslations } from "next-intl";
import type { BoosterCard } from "@/types/mini-game";
import { formatEuro } from "@/utils/miniGames/pricing";
import { CardTile } from "./CardTile";

interface PlayerBoardProps {
  name: string;
  score: number;
  packs: BoosterCard[][];
  accent: "blue" | "red";
}

/** Everything a player has opened so far, with the running total. */
export function PlayerBoard({ name, score, packs, accent }: PlayerBoardProps) {
  const t = useTranslations("CaseOpening");
  const locale = useLocale();
  const header =
    accent === "blue"
      ? "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
      : "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400";
  const cards = packs.flat();

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between rounded-xl border p-3 ${header}`}>
        <h4 className="font-heading font-semibold">{name}</h4>
        <span className="font-mono text-lg font-semibold text-foreground">
          {formatEuro(score, locale)}
        </span>
      </div>
      {cards.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          {t("noCardYet")}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {cards.map((card, index) => (
            <CardTile key={`${card.id}-${index}`} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
