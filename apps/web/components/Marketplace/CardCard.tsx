"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/utils/price";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PokemonCardType } from "@/types/cardPokemon";

interface CardCardProps {
  card: PokemonCardType;
  minPrice?: number;
  avgPrice?: number;
  listingCount?: number;
  currency?: string;
  className?: string;
  showTrend?: boolean;
  trendValue?: number;
}

export function CardCard({
  card,
  minPrice,
  avgPrice,
  listingCount,
  currency = "EUR",
  className,
  showTrend = false,
  trendValue,
}: CardCardProps) {
  const hasListings = listingCount !== undefined && listingCount > 0;

  return (
    <Link href={`/marketplace/cards/${card.id}`}>
      <Card
        className={cn(
          "group hover:shadow-lg transition-all duration-200 cursor-pointer h-full flex flex-col",
          className,
        )}
      >
        <CardHeader className="pb-3">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted mb-3">
            <Image
              src={
                card.image
                  ? card.image + "/high.png"
                  : "/images/carte-pokemon-dos.jpg"
              }
              alt={card.name ?? ""}
              fill
              className="object-contain group-hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {card.name}
            </h3>
            {card.set && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {card.set.name}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 mt-auto">
          <div className="flex flex-wrap gap-2 mb-3">
            {card.rarity && (
              <Badge
                variant="outline"
                className="text-xs"
              >
                {card.rarity}
              </Badge>
            )}
            {hasListings && (
              <Badge
                variant="secondary"
                className="text-xs"
              >
                {listingCount} offre{listingCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              {hasListings && minPrice !== undefined ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(minPrice, currency)}
                    </span>
                    {showTrend && trendValue !== undefined && (
                      <div className="flex items-center gap-1">
                        {trendValue > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : trendValue < 0 ? (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        ) : (
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span
                          className={cn(
                            "text-xs font-medium",
                            trendValue > 0 && "text-green-600",
                            trendValue < 0 && "text-red-600",
                            trendValue === 0 && "text-muted-foreground",
                          )}
                        >
                          {Math.abs(trendValue).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                  {avgPrice !== undefined && avgPrice !== minPrice && (
                    <p className="text-xs text-muted-foreground">
                      Moyenne: {formatPrice(avgPrice, currency)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune offre</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

