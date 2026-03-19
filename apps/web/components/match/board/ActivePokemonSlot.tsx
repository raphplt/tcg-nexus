"use client";

import { cn } from "@/lib/utils";
import type { SanitizedPokemonCardView } from "@/types/match-online";
import { GameCard, EmptySlot } from "./GameCard";
import { PokemonOverlay } from "./PokemonOverlay";

interface ActivePokemonSlotProps {
  pokemon: SanitizedPokemonCardView | null;
  isOpponent?: boolean;
  onClick?: () => void;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
}

export function ActivePokemonSlot({
  pokemon,
  isOpponent = false,
  onClick,
  selected = false,
  highlighted = false,
  disabled = false,
}: ActivePokemonSlotProps) {
  if (!pokemon) {
    return (
      <EmptySlot
        size="lg"
        highlighted={highlighted}
        onClick={onClick}
        label="Actif"
      />
    );
  }

  return (
    <div className={cn("relative", isOpponent && "rotate-0")}>
      <GameCard
        image={pokemon.image}
        name={pokemon.name}
        size="lg"
        onClick={onClick}
        selected={selected}
        highlighted={highlighted}
        disabled={disabled}
      />
      <PokemonOverlay pokemon={pokemon} />
    </div>
  );
}
