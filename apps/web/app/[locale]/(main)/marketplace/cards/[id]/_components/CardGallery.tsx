"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { PokemonCardType } from "@/types/cardPokemon";
import { getCardImage, getSetSymbol, rarityToImage } from "@/utils/images";

interface CardGalleryProps {
  card: PokemonCardType;
}

export function CardGallery({ card }: CardGalleryProps) {
  const setSymbol = card.set ? getSetSymbol(card.set) : null;
  const rarityIcon = card.rarity ? rarityToImage[card.rarity] : null;

  return (
    <div className="lg:sticky lg:top-6 space-y-3">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="relative aspect-3/4 w-full">
          <Image
            src={getCardImage(card)}
            alt={card.name || "Carte Pokémon"}
            fill
            priority
            sizes="(max-width: 1024px) 90vw, 30vw"
            className="object-contain drop-shadow-md"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {card.set && (
          <Badge variant="outline" className="gap-1.5 py-1 font-normal">
            {setSymbol && (
              <Image src={setSymbol} alt="" width={14} height={14} />
            )}
            {card.set.name}
          </Badge>
        )}
        {card.rarity && (
          <Badge variant="outline" className="gap-1.5 py-1 font-normal">
            {rarityIcon && (
              <Image src={rarityIcon} alt="" width={14} height={14} />
            )}
            {card.rarity}
          </Badge>
        )}
      </div>
    </div>
  );
}
