import { Card, CardHeader, CardTitle } from "../ui/card";
import Image from "next/image";
import { PokemonSetType } from "@/types/cardPokemon";
import Link from "next/link";

const SetCard = ({ set }: { set: PokemonSetType }) => {
  return (
    <Link
      key={set.id}
      href={`/marketplace/cards?setId=${set.id}`}
    >
      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="aspect-square relative mb-3 bg-muted rounded-lg overflow-hidden">
            {set.logo ? (
              <Image
                src={set.logo}
                alt={set.name}
                fill
                className="object-contain group-hover:scale-105 transition-transform duration-200"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                {set.name}
              </div>
            )}
          </div>
          <CardTitle className="text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {set.name}
          </CardTitle>
        </CardHeader>
      </Card>
    </Link>
  );
};
export default SetCard;
