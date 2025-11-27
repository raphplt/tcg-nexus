import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PokemonCardType } from "@/types/cardPokemon";
import { rarityToImage } from "@/utils/images";
import Image from "next/image";

interface CardImageProps {
  card: PokemonCardType;
}

export function CardImage({ card }: CardImageProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="relative aspect-[3/4] w-full max-w-md mx-auto">
          {card.image ? (
            <Image
              src={card.image + "/high.png"}
              alt={card.name || "Carte inconnue"}
              fill
              className="object-contain rounded-lg"
              priority
            />
          ) : (
            <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
              No Image
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {card.set && (
            <Badge
              variant="outline"
              className="text-sm px-3 py-1"
            >
              <Image
                src={card.set.symbol || ""}
                alt={card.set.name}
                width={16}
                height={16}
                className="mr-1"
              />
              {card.set.name}
            </Badge>
          )}
          {card.rarity && (
            <Badge
              variant="outline"
              className="text-sm px-3 py-1 flex items-center gap-1"
            >
              <Image
                src={rarityToImage[card.rarity]}
                alt={card.rarity}
                width={16}
                height={16}
              />
              {card.rarity}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
