"use client";

import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/ui/SmartImage";
import { PokemonCardType } from "@/types/cardPokemon";
import { getCardImage, getRarityImage, getSetSymbol } from "@/utils/images";

interface CardGalleryProps {
  card: PokemonCardType;
}

export function CardGallery({ card }: CardGalleryProps) {
  const setSymbol = card.set ? getSetSymbol(card.set) : null;
  const rarityIcon = card.rarity ? getRarityImage(card.rarity) : null;

  return (
    <div className="lg:sticky lg:top-6 space-y-3">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="relative aspect-3/4 w-full">
          <SmartImage
            src={getCardImage(card, "high")}
            fallbackSrc="/images/carte-pokemon-dos.jpg"
            alt={card.name || "Carte Pokémon"}
            className="object-contain drop-shadow-md"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {card.set && (
          <Badge variant="outline" className="gap-1.5 py-1 font-normal">
            {setSymbol && (
              <img
                src={setSymbol}
                alt=""
                className="w-3.5 h-3.5 object-contain flex-shrink-0"
                loading="lazy"
              />
            )}
            {card.set.name}
          </Badge>
        )}
        {card.rarity && (
          <Badge variant="outline" className="gap-1.5 py-1 font-normal">
            {rarityIcon && (
              <img
                src={rarityIcon}
                alt=""
                className="w-3.5 h-3.5 object-contain flex-shrink-0"
                loading="lazy"
              />
            )}
            {card.rarity}
          </Badge>
        )}
      </div>
    </div>
  );
}
