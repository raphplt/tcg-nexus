"use client";

import type { SanitizedPokemonCardView } from "@/types/match-online";
import { GameCard, EmptySlot } from "./GameCard";
import { PokemonOverlay } from "./PokemonOverlay";

interface BenchSlotProps {
  pokemon?: SanitizedPokemonCardView | null;
  onClick?: () => void;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  showEmpty?: boolean;
}

export function BenchSlot({
  pokemon,
  onClick,
  selected = false,
  highlighted = false,
  disabled = false,
  showEmpty = true,
}: BenchSlotProps) {
  if (!pokemon) {
    if (!showEmpty) return null;
    return <EmptySlot size="sm" highlighted={highlighted} onClick={onClick} />;
  }

  return (
    <div className="relative">
      <GameCard
        image={pokemon.image}
        name={pokemon.name}
        size="sm"
        onClick={onClick}
        selected={selected}
        highlighted={highlighted}
        disabled={disabled}
      />
      <PokemonOverlay pokemon={pokemon} compact />
    </div>
  );
}
