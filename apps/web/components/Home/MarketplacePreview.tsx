import React from "react";
import { H2 } from "../Shared/Titles";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import Image from "next/image";
import { ArrowRight, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { PaginatedResult } from "@/types/pagination";
import { Listing } from "@/types/listing";
import { marketplaceService } from "@/services/marketplace.service";
import { formatPrice } from "@/utils/price";
import { useRouter } from "next/navigation";

const MarketplacePreview = () => {
  const router = useRouter();
  const { data, isLoading, error } = usePaginatedQuery<
    PaginatedResult<Listing>
  >(["listings", 3], marketplaceService.getPaginated, {
    page: 1,
    limit: 3,
  });

  return (
    <Card className="bg-card rounded-xl shadow p-6">
      <H2 className="mb-4">Marketplace</H2>
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          Chargement...
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-8 text-destructive">
          Erreur lors du chargement des cartes
        </div>
      )}
      <div className="flex flex-col gap-4">
        {data?.data?.map((card) => (
          <Link
            key={card.id}
            href={`/marketplace/cards/${card.pokemonCard.id}`}
            className="flex items-center gap-4 p-3 rounded-lg border hover:shadow-md transition bg-background"
          >
            <div className="flex-shrink-0">
              {card.pokemonCard.image ? (
                <Image
                  src={card.pokemonCard.image + "/low.png"}
                  alt={card.pokemonCard.name || "Pokemon Card"}
                  width={56}
                  height={80}
                  className="object-cover rounded border"
                />
              ) : (
                <div className="w-14 h-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                  N/A
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">
                {card.pokemonCard.name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {card.pokemonCard.set?.name || "Set inconnu"}
              </div>
              <div className="text-xs text-muted-foreground">
                {card.pokemonCard.rarity || "Rareté inconnue"}
              </div>
              <div className="text-sm font-medium text-primary mt-1">
                {formatPrice(card.price, card.currency)}
              </div>
            </div>

            <Button
              variant="secondary"
              asChild
            >
              <Link href={`/marketplace/cards/${card.id}`}>
                <ShoppingCart className="mr-2 w-4 h-4" />
                Acheter
              </Link>
            </Button>
          </Link>
        ))}
      </div>
      <Button
        variant="outline"
        asChild
        size="sm"
        className="w-full mt-4"
      >
        <Link
          href="/marketplace"
          className="flex items-center gap-2"
        >
          Voir tous les articles
          <ArrowRight className="mr-2 w-4 h-4" />
        </Link>
      </Button>
    </Card>
  );
};

export default MarketplacePreview;
