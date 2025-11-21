import React from "react";
import { H2 } from "../Shared/Titles";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import Image from "next/image";
import { ArrowRight, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useMarketplaceHome } from "@/hooks/useMarketplace";
import { Currency } from "@/utils/enums";

const MarketplacePreview = () => {
  const { popularCards, loadingPopular: isLoading } = useMarketplaceHome();
  return (
    <Card className="bg-card rounded-xl shadow p-6">
      <H2 className="mb-4">Marketplace</H2>
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          Chargement...
        </div>
      )}

      <div className="flex flex-col gap-4">
        {popularCards?.slice(0, 4).map((popularCard) => (
          <div
            key={popularCard.card.id}
            className="flex items-center gap-4 p-3 rounded-lg border hover:shadow-md transition bg-background"
          >
            <Link
              href={`/marketplace/cards/${popularCard.card.id}`}
              className="flex items-center gap-4 flex-1 min-w-0"
            >
              <div className="flex-shrink-0">
                {popularCard.card.image ? (
                  <Image
                    src={popularCard.card.image + "/low.png"}
                    alt={popularCard.card.name || "Pokemon Card"}
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
                  {popularCard.card.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {popularCard.card.set?.name || "Set inconnu"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {popularCard.card.rarity || "Rareté inconnue"}
                </div>
                <div className="text-sm font-medium text-primary mt-1">
                  {popularCard.avgPrice} {Currency.EUR}
                  {/* {formatPrice(popularCard.avgPrice, Currency.EUR)} */}
                </div>
              </div>
            </Link>

            <Button
              variant="secondary"
              asChild
            >
              <Link
                href={`/marketplace/cards/${popularCard.card.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ShoppingCart className="mr-2 w-4 h-4" />
                Acheter
              </Link>
            </Button>
          </div>
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
