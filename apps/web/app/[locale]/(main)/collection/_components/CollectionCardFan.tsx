"use client";

import { Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { SmartImage } from "@/components/ui/SmartImage";
import { cn } from "@/lib/utils";
import type { PokemonCardType } from "@/types/cardPokemon";
import { getCardImage } from "@/utils/images";

/** Spacing and tilt between two neighbouring cards of the fan. */
const FAN_STEP_X = 46;
const FAN_STEP_ROTATION = 11;

/**
 * Placement of a card in a fan of `total` cards, measured from its center so
 * the hand stays centered whatever the number of cards.
 */
function fanStyle(index: number, total: number): CSSProperties {
  const distanceToCenter = index - (total - 1) / 2;
  return {
    "--fan-x": `${distanceToCenter * FAN_STEP_X}px`,
    "--fan-rot": `${distanceToCenter * FAN_STEP_ROTATION}deg`,
    zIndex: Math.round(10 - Math.abs(distanceToCenter) * 2),
  } as CSSProperties;
}

interface CollectionCardFanProps {
  cards: PokemonCardType[];
  emptyLabel: string;
  className?: string;
}

/**
 * Spreads the first cards of a collection as a hand of cards. The fan opens a
 * little further when the surrounding `group` is hovered.
 */
export function CollectionCardFan({
  cards,
  emptyLabel,
  className,
}: CollectionCardFanProps) {
  const visibleCards = cards.slice(0, 3);

  if (visibleCards.length === 0) {
    return (
      <div className={cn("collection-fan h-32", className)}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="collection-fan-card flex h-[92px] w-[66px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/60"
            style={fanStyle(index, 3)}
          >
            {index === 1 ? (
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            ) : null}
          </div>
        ))}
        <span className="sr-only">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className={cn("collection-fan h-32", className)}>
      {visibleCards.map((card, index) => (
        <div
          key={card.id}
          className="collection-fan-card relative h-[92px] w-[66px] overflow-hidden rounded-lg border border-border/60 bg-card shadow-md"
          style={fanStyle(index, visibleCards.length)}
        >
          <SmartImage
            src={getCardImage(card, "low")}
            fallbackSrc="/images/carte-pokemon-dos.jpg"
            alt={card.name ?? emptyLabel}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
