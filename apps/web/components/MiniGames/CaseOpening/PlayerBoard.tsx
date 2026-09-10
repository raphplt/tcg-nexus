"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BoosterCard } from "@/types/mini-game";
import { isHit, packValue } from "@/utils/miniGames/booster";
import { formatEuro } from "@/utils/miniGames/pricing";
import { CardTile } from "./CardTile";

interface PlayerBoardProps {
  name: string;
  score: number;
  packs: BoosterCard[][];
  accent: "blue" | "red";
}

/**
 * Everything a player has opened so far, grouped by round.
 * Adapts card size and density intelligently as rounds advance:
 * - Round 1: Full-detail cards (size="md", 3-4 cols)
 * - Round 2: Compact cards (size="sm", 4-6 cols)
 * - Round 3+: Dense cards (size="xs", 5-6 cols) with collapsible round sections.
 *
 * @param name - Display name of the player.
 * @param score - Cumulative score in euros.
 * @param packs - Array of packs opened per round.
 * @param accent - Player theme accent color.
 */
export function PlayerBoard({ name, score, packs, accent }: PlayerBoardProps) {
  const t = useTranslations("CaseOpening");
  const locale = useLocale();

  const [collapsedRounds, setCollapsedRounds] = useState<Record<number, boolean>>({});

  const totalPacks = packs.length;
  const totalCards = packs.reduce((acc, p) => acc + p.length, 0);

  const density: "large" | "compact" | "dense" =
    totalPacks <= 1 ? "large" : totalPacks === 2 ? "compact" : "dense";

  const cardSize = density === "large" ? "md" : density === "compact" ? "sm" : "xs";

  const gridClass =
    density === "large"
      ? "grid grid-cols-3 sm:grid-cols-4 gap-2.5"
      : density === "compact"
        ? "grid grid-cols-4 sm:grid-cols-6 gap-2"
        : "grid grid-cols-5 sm:grid-cols-6 gap-1.5";

  const headerStyle =
    accent === "blue"
      ? "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
      : "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400";

  const toggleRound = (index: number) => {
    setCollapsedRounds((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const allCollapsed = totalPacks > 0 && packs.every((_, i) => collapsedRounds[i]);

  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsedRounds({});
    } else {
      const next: Record<number, boolean> = {};
      packs.forEach((_, i) => {
        next[i] = true;
      });
      setCollapsedRounds(next);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={`flex items-center justify-between rounded-xl border p-3 shadow-xs ${headerStyle}`}
      >
        <div className="flex items-center gap-2">
          <h4 className="font-heading font-semibold">{name}</h4>
          {totalCards > 0 && (
            <Badge
              variant="outline"
              className="px-1.5 py-0 text-[10px] font-mono text-muted-foreground"
            >
              {totalCards} {totalCards === 1 ? t("card") : t("cards")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {totalPacks >= 3 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {allCollapsed ? t("expandAll") : t("collapseAll")}
            </Button>
          )}
          <span className="font-mono text-lg font-semibold text-foreground">
            {formatEuro(score, locale)}
          </span>
        </div>
      </div>

      {totalCards === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          {t("noCardYet")}
        </div>
      ) : (
        <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
          {packs.map((pack, packIndex) => {
            const roundNumber = packIndex + 1;
            const isLatest = packIndex === totalPacks - 1;
            const isCollapsed = Boolean(collapsedRounds[packIndex]);
            const roundValue = packValue(pack);
            const hits = pack.filter(isHit).length;

            return (
              <div
                key={packIndex}
                className={cn(
                  "rounded-lg border bg-card/40 p-2.5 transition-colors",
                  isLatest
                    ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/70",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleRound(packIndex)}
                  className="flex w-full items-center justify-between py-0.5 text-left transition-opacity hover:opacity-80"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {t("roundLabel", { round: roundNumber })}
                    </span>
                    {isLatest && totalPacks > 1 && (
                      <Badge className="border-primary/30 bg-primary/20 px-1 py-0 text-[9px] font-medium text-primary">
                        {t("latestRound")}
                      </Badge>
                    )}
                    {hits > 0 && (
                      <span className="flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                        <Sparkles className="h-2.5 w-2.5" />
                        {hits} {t("hit")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      ({pack.length} {pack.length === 1 ? t("card") : t("cards")})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      +{formatEuro(roundValue, locale)}
                    </span>
                    {isCollapsed ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {!isCollapsed && (
                  <div className={cn("mt-2", gridClass)}>
                    {pack.map((card, cardIndex) => (
                      <CardTile
                        key={`${card.id}-${packIndex}-${cardIndex}`}
                        card={card}
                        size={cardSize}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
