"use client";

import { cn } from "@/lib/utils";
import type { SanitizedHandCardView } from "@/types/match-online";
import { GameCard } from "./GameCard";

interface HandBarProps {
  hand: SanitizedHandCardView[];
  selectedCardId: string | null;
  onCardClick: (card: SanitizedHandCardView) => void;
  disabled?: boolean;
}

export function HandBar({
  hand,
  selectedCardId,
  onCardClick,
  disabled = false,
}: HandBarProps) {
  if (!hand.length) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-white/40">
        Votre main est vide.
      </div>
    );
  }

  const maxOverlap = Math.max(0, hand.length - 7);
  const overlapPx = maxOverlap > 0 ? Math.min(32, (maxOverlap * 20)) : 0;

  return (
    <div className="flex items-end justify-center py-2 overflow-x-auto">
      <div className="flex items-end" style={{ gap: overlapPx > 0 ? undefined : "6px" }}>
        {hand.map((card, index) => {
          const isSelected = card.instanceId === selectedCardId;
          const rotation = hand.length > 1
            ? (index - (hand.length - 1) / 2) * 2
            : 0;
          const translateY = hand.length > 1
            ? Math.abs(index - (hand.length - 1) / 2) * 3
            : 0;

          return (
            <div
              key={card.instanceId}
              className="relative transition-all duration-200 ease-out"
              style={{
                transform: `rotate(${rotation}deg) translateY(${isSelected ? -16 : translateY}px)`,
                marginLeft: index > 0 && overlapPx > 0 ? `-${overlapPx / hand.length}px` : undefined,
                zIndex: isSelected ? 50 : index,
              }}
            >
              <GameCard
                image={card.image}
                name={card.name}
                size="md"
                selected={isSelected}
                onClick={() => onCardClick(card)}
                disabled={disabled}
              />
              {/* Category indicator */}
              <div className={cn(
                "absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5",
                "text-[7px] font-bold uppercase tracking-wider",
                card.category === "Pokémon" && "bg-blue-600 text-white",
                card.category === "Dresseur" && "bg-rose-600 text-white",
                card.category === "Énergie" && "bg-amber-600 text-white",
              )}>
                {card.category === "Pokémon"
                  ? card.stage === "De base" ? "BASE" : "EVO"
                  : card.category === "Énergie"
                    ? "NRJ"
                    : "DRS"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
