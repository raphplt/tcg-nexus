"use client";

import Image from "next/image";
import { PokemonCardType } from "@/types/cardPokemon";
import { typeToImage } from "@/utils/images";
import { slugify } from "@/utils/text";

interface CardHeadingProps {
  card: PokemonCardType;
}

export function CardHeading({ card }: CardHeadingProps) {
  const officialCount = card.set?.cardCount?.official;
  const cardNumber = card.localId
    ? officialCount
      ? `${card.localId}/${officialCount}`
      : card.localId
    : null;

  const meta = [
    card.set?.name,
    card.illustrator ? `Illus. ${card.illustrator}` : null,
    card.hp ? `${card.hp} PV` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {card.types?.map((type) => {
          const icon = typeToImage[slugify(type.toLowerCase())];
          return icon ? (
            <Image key={type} src={icon} alt={type} width={22} height={22} />
          ) : null;
        })}
        {cardNumber && (
          <span className="text-sm font-medium text-muted-foreground">
            N° {cardNumber}
          </span>
        )}
      </div>

      <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
        {card.name}
      </h1>

      {meta.length > 0 && (
        <p className="text-sm text-muted-foreground">{meta.join(" · ")}</p>
      )}
    </div>
  );
}
