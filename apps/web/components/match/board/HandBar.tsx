"use client";

import { AnimatePresence, motion } from "framer-motion";
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
      <div className="space-y-2 px-3 pb-3 pt-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.22em] text-white/25">
          <span>Main</span>
          <span>0 carte</span>
        </div>
        <div className="flex items-center justify-center rounded-2xl border border-white/8 bg-black/20 py-4 text-sm font-medium tracking-wide text-white/30">
          Votre main est vide.
        </div>
      </div>
    );
  }

  const maxOverlap = Math.max(0, hand.length - 7);
  const overlapPx = maxOverlap > 0 ? Math.min(32, maxOverlap * 20) : 0;

  return (
    <div className="space-y-2 px-3 pb-3 pt-2">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.22em] text-white/28">
        <span>Main</span>
        <span>
          {hand.length} carte{hand.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto rounded-[1.5rem] border border-white/8 bg-black/18 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div
          className="flex items-end justify-center"
          style={{ gap: overlapPx > 0 ? undefined : "6px" }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {hand.map((card, index) => {
              const isSelected = card.instanceId === selectedCardId;
              const rotation =
                hand.length > 1 ? (index - (hand.length - 1) / 2) * 2 : 0;
              const translateY =
                hand.length > 1
                  ? Math.abs(index - (hand.length - 1) / 2) * 3
                  : 0;

              return (
                <motion.div
                  key={card.instanceId}
                  layout
                  initial={{ opacity: 0, y: 40, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    rotate: rotation,
                    translateY: isSelected ? -16 : translateY,
                  }}
                  exit={{
                    opacity: 0,
                    y: -60,
                    scale: 0.6,
                    transition: { duration: 0.3 },
                  }}
                  transition={{
                    type: "spring",
                    damping: 20,
                    stiffness: 300,
                  }}
                  className="relative"
                  style={{
                    marginLeft:
                      index > 0 && overlapPx > 0
                        ? `-${overlapPx / hand.length}px`
                        : undefined,
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
                  <div
                    className={cn(
                      "absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5",
                      "text-[7px] font-bold uppercase tracking-wider",
                      card.category === "Pokémon" && "bg-blue-600 text-white",
                      card.category === "Dresseur" && "bg-rose-600 text-white",
                      card.category === "Énergie" && "bg-amber-600 text-white",
                    )}
                  >
                    {card.category === "Pokémon"
                      ? card.stage === "De base"
                        ? "BASE"
                        : "EVO"
                      : card.category === "Énergie"
                        ? "NRJ"
                        : "DRS"}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
