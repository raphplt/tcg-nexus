"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrencyStore } from "@/store/currency.store";
import { PokemonCardType } from "@/types/cardPokemon";
import { getCardImage } from "@/utils/images";
import { getMarketReferencePrice } from "@/utils/price";

interface CardListItemProps {
  card: PokemonCardType;
  minPrice?: number;
  avgPrice?: number;
  listingCount?: number;
  currency?: string;
  className?: string;
}

export function CardListItem({
  card,
  minPrice,
  avgPrice,
  listingCount,
  currency = "EUR",
  className,
}: CardListItemProps) {
  const { formatPrice, currency: userCurrency } = useCurrencyStore();
  const hasListings = listingCount !== undefined && listingCount > 0;
  const marketRef = !hasListings
    ? getMarketReferencePrice(card.pricing, userCurrency)
    : null;

  return (
    <Link href={`/marketplace/cards/${card.id}`}>
      <div
        className={cn(
          "flex items-center gap-4 p-3 rounded-lg border bg-card hover:shadow-md transition-all duration-200 cursor-pointer",
          className,
        )}
      >
        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded">
          <Image
            src={getCardImage(card)}
            alt={card.name || "Pokemon Card"}
            fill
            className="object-contain"
            sizes="48px"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm line-clamp-1 hover:text-primary transition-colors">
              {card.name}
            </h3>
            <span className="text-xs text-muted-foreground">
              #{card.localId}
            </span>
          </div>
          {card.set && (
            <div className="flex items-center gap-1 mt-0.5">
              {card.set.symbol && (
                <Image src={card.set.symbol} alt="" width={14} height={14} />
              )}
              <p className="text-xs text-muted-foreground line-clamp-1">
                {card.set.name}
              </p>
            </div>
          )}
        </div>

        <div className="hidden sm:flex shrink-0">
          {card.rarity && (
            <Badge variant="outline" className="text-xs">
              {card.rarity}
            </Badge>
          )}
        </div>

        <div className="hidden md:flex shrink-0">
          {hasListings && (
            <Badge variant="secondary" className="text-xs">
              {listingCount} offre{listingCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <div className="shrink-0 text-right min-w-[80px]">
          {hasListings && minPrice !== undefined ? (
            <div>
              <span className="text-sm font-bold text-primary">
                {formatPrice(minPrice, currency)}
              </span>
              {avgPrice !== undefined && avgPrice !== minPrice && (
                <p className="text-xs text-muted-foreground">
                  Moy: {formatPrice(avgPrice, currency)}
                </p>
              )}
            </div>
          ) : marketRef ? (
            <span className="text-sm font-bold text-muted-foreground">
              ~{formatPrice(marketRef.price, marketRef.currency)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Aucune offre</span>
          )}
        </div>
      </div>
    </Link>
  );
}
