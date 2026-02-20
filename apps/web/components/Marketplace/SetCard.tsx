import Image from "next/image";
import Link from "next/link";
import { PokemonSetType } from "@/types/cardPokemon";
import { Card, CardHeader, CardTitle } from "../ui/card";

const SetCard = ({ set }: { set: PokemonSetType }) => {
  // console.log("set", set);
  return (
    <Link key={set.id} href={`/marketplace/cards?setId=${set.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="aspect-square relative mb-3 bg-muted rounded-lg overflow-hidden">
            {set.logo ? (
              <img
                src={set.logo}
                alt={set.name}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
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
