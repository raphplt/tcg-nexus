"use client";

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
  const benchSlots = Array.from({ length: MAX_BENCH }, (_, i) =>
    player.bench[i] ?? null,
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
        <span className={cn(
          "text-xs font-semibold uppercase tracking-wider",
          isOpponent ? "text-red-300" : "text-blue-300",
        )}>
          {isOpponent ? player.name : "Vous"}
        </span>
        {isCurrentTurn && (
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        )}
      </div>

      {/* Bench row */}
      <div className="flex items-center gap-1.5">
        {benchSlots.map((pokemon, i) => (
          <BenchSlot
            key={pokemon?.instanceId ?? `empty-${i}`}
            pokemon={pokemon}
            onClick={
              pokemon && !isOpponent
                ? () => onBenchPokemonClick?.(pokemon.instanceId)
                : !pokemon && highlightedEmptyBench && !isOpponent
                  ? () => onBenchPokemonClick?.("empty")
                  : undefined
            }
            highlighted={
              (pokemon && highlightedBenchIds.includes(pokemon.instanceId)) ||
              (!pokemon && highlightedEmptyBench)
            }
            disabled={disabled || isOpponent}
            showEmpty={!isOpponent || i < player.bench.length}
          />
        ))}
      </div>

      {/* Active Pokemon */}
      <ActivePokemonSlot
        pokemon={player.active}
        isOpponent={isOpponent}
        onClick={!isOpponent ? onActivePokemonClick : undefined}
        selected={activeSelected}
        highlighted={activeHighlighted}
        disabled={disabled || isOpponent}
      />

      {/* Side info: deck, prizes, discard */}
      <div className={cn(
        "absolute flex flex-col items-center gap-2",
        isOpponent ? "right-4 top-2" : "left-4 bottom-2",
      )}>
        {/* Deck pile */}
        <div className="relative">
          <GameCard
            name="Deck"
            faceDown
            size="sm"
            disabled
          />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-black/80 rounded px-1.5 py-0.5">
            <span className="text-[9px] text-white font-bold">{player.deckCount}</span>
          </div>
        </div>

        {/* Prize cards */}
        <div className="relative">
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: Math.min(player.prizesRemaining, MAX_PRIZES) }, (_, i) => (
              <div
                key={`prize-${i}`}
                className="w-8 h-2 rounded-sm bg-gradient-to-r from-yellow-600 to-yellow-500 border border-yellow-400/30"
              />
            ))}
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
              image={player.discard[player.discard.length - 1]?.image}
              name="Défausse"
              size="sm"
              disabled
              className="opacity-70"
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-black/80 rounded px-1.5 py-0.5">
              <span className="text-[9px] text-white font-bold">{player.discard.length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
