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
      <div className="flex h-16 items-center justify-center text-sm font-medium tracking-wide text-white/30">
        Votre main est vide.
      </div>
    );
  }

  const count = hand.length;
  // How much each card overlaps its neighbor (more cards = tighter)
  const overlap = count <= 5 ? -8 : count <= 10 ? -28 : -40;

  return (
    <div className="relative h-36 sm:h-40">
      {/* Card count label */}
      <div className="absolute right-3 top-1 z-10 text-[10px] font-bold uppercase tracking-[0.22em] text-white/25">
        {count} carte{count > 1 ? "s" : ""}
      </div>

      {/* Cards row — centered, overlapping, bottom-anchored */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
        <AnimatePresence initial={false} mode="popLayout">
          {hand.map((card, index) => {
            const isSelected = card.instanceId === selectedCardId;
            const mid = (count - 1) / 2;
            const offset = index - mid;

            // Fan rotation: ±15° max spread
            const maxAngle = Math.min(count * 2.5, 20);
            const rotation =
              count > 1 ? (offset / mid) * maxAngle : 0;

            // Arc: cards at edges sit lower
            const normalizedOffset = count > 1 ? Math.abs(offset / mid) : 0;
            const arc = normalizedOffset ** 2 * 24;

            return (
              <motion.div
                key={card.instanceId}
                layout
                initial={{ opacity: 0, y: 80, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  y: -80,
                  scale: 0.5,
                  transition: { duration: 0.25 },
                }}
                transition={{
                  type: "spring",
                  damping: 22,
                  stiffness: 280,
                }}
                className={cn(
                  "relative flex-shrink-0",
                  // Push cards down so only top ~55% shows; hover reveals full card
                  "translate-y-[45%]",
                  !isSelected &&
                    "hover:-translate-y-4 hover:!rotate-0 hover:scale-110",
                  isSelected &&
                    "-translate-y-6 !rotate-0 scale-110",
                  "transition-[transform,filter] duration-200 ease-out",
                )}
                style={{
                  marginLeft: index === 0 ? 0 : overlap,
                  rotate: `${rotation}deg`,
                  marginBottom: -arc,
                  zIndex: isSelected ? 50 : index,
                  filter: isSelected
                    ? "drop-shadow(0 0 20px rgba(96,165,250,0.5))"
                    : undefined,
                }}
                whileHover={{ zIndex: 40 }}
              >
                <GameCard
                  image={card.image}
                  name={card.name}
                  size="md"
                  selected={isSelected}
                  onClick={() => onCardClick(card)}
                  disabled={disabled}
                />
                {/* Category badge */}
                <div
                  className={cn(
                    "absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5",
                    "text-[7px] font-bold uppercase tracking-wider shadow-md",
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
  );
}
