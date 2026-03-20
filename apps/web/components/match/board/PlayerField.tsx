"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SanitizedPlayerView } from "@/types/match-online";
import { ActivePokemonSlot } from "./ActivePokemonSlot";
import { BenchSlot } from "./BenchSlot";
import { GameCard } from "./GameCard";

const MAX_BENCH = 5;
const MAX_PRIZES = 6;

interface PlayerFieldProps {
  player: SanitizedPlayerView;
  isOpponent?: boolean;
  isCurrentTurn?: boolean;
  onActivePokemonClick?: () => void;
  onBenchPokemonClick?: (instanceId: string) => void;
  activeSelected?: boolean;
  activeHighlighted?: boolean;
  highlightedBenchIds?: string[];
  highlightedEmptyBench?: boolean;
  disabled?: boolean;
}

export function PlayerField({
  player,
  isOpponent = false,
  isCurrentTurn = false,
  onActivePokemonClick,
  onBenchPokemonClick,
  activeSelected = false,
  activeHighlighted = false,
  highlightedBenchIds = [],
  highlightedEmptyBench = false,
  disabled = false,
}: PlayerFieldProps) {
  const benchSlots = Array.from(
    { length: MAX_BENCH },
    (_, i) => player.bench[i] ?? null,
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5",
        isOpponent && "flex-col-reverse",
      )}
    >
      {/* Player name and turn indicator */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            isOpponent ? "text-red-300" : "text-blue-300",
          )}
        >
          {isOpponent ? player.name : "Vous"}
        </span>
        {isCurrentTurn && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-block w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"
          >
            <span className="block w-full h-full rounded-full bg-yellow-400 animate-ping opacity-75" />
          </motion.span>
        )}
      </div>

      {/* Bench row */}
      <div className="flex items-center gap-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {benchSlots.map((pokemon, i) => (
            <motion.div
              key={pokemon?.instanceId ?? `empty-${i}`}
              layout
              initial={
                pokemon ? { scale: 0, opacity: 0 } : false
              }
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                damping: 15,
                stiffness: 300,
              }}
            >
              <BenchSlot
                pokemon={pokemon}
                onClick={
                  pokemon && !isOpponent
                    ? () =>
                        onBenchPokemonClick?.(
                          pokemon.instanceId,
                        )
                    : !pokemon &&
                        highlightedEmptyBench &&
                        !isOpponent
                      ? () => onBenchPokemonClick?.("empty")
                      : undefined
                }
                highlighted={
                  (pokemon &&
                    highlightedBenchIds.includes(
                      pokemon.instanceId,
                    )) ||
                  (!pokemon && highlightedEmptyBench)
                }
                disabled={disabled || isOpponent}
                showEmpty={
                  !isOpponent || i < player.bench.length
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Active Pokemon */}
      <motion.div
        layout
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
      >
        <ActivePokemonSlot
          pokemon={player.active}
          isOpponent={isOpponent}
          onClick={!isOpponent ? onActivePokemonClick : undefined}
          selected={activeSelected}
          highlighted={activeHighlighted}
          disabled={disabled || isOpponent}
        />
      </motion.div>

      {/* Side info: deck, prizes, discard */}
      <div
        className={cn(
          "absolute flex flex-col items-center gap-2",
          isOpponent ? "right-4 top-2" : "left-4 bottom-2",
        )}
      >
        {/* Deck pile */}
        <div className="relative group">
          <GameCard name="Deck" faceDown size="sm" disabled />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-black/80 rounded px-1.5 py-0.5">
            <span className="text-[9px] text-white font-bold">
              {player.deckCount}
            </span>
          </div>
        </div>

        {/* Prize cards */}
        <div className="relative">
          <div className="flex flex-col gap-0.5">
            {Array.from(
              {
                length: Math.min(
                  player.prizesRemaining,
                  MAX_PRIZES,
                ),
              },
              (_, i) => (
                <motion.div
                  key={`prize-${i}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="w-8 h-2 rounded-sm bg-gradient-to-r from-yellow-600 to-yellow-500 border border-yellow-400/30"
                />
              ),
            )}
          </div>
          <div className="mt-0.5 text-center">
            <span className="text-[8px] text-yellow-300/80">
              {player.prizesRemaining} prix
            </span>
          </div>
        </div>

        {/* Discard pile */}
        {player.discard.length > 0 && (
          <div className="relative">
            <GameCard
              image={
                player.discard[player.discard.length - 1]?.image
              }
              name="Défausse"
              size="sm"
              disabled
              className="opacity-70"
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-black/80 rounded px-1.5 py-0.5">
              <span className="text-[9px] text-white font-bold">
                {player.discard.length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
