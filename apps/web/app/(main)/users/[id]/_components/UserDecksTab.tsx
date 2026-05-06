"use client";

import { useQuery } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { decksService } from "@/services/decks.service";
import type { Deck } from "@/types/Decks";

interface UserDecksTabProps {
  userId: number;
}

export function UserDecksTab({ userId }: UserDecksTabProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-public-decks", userId],
    queryFn: () => decksService.getPublicDecksByUser(userId),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-destructive">Erreur de chargement</p>;
  }
  if (!data || data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun deck public</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.items.map((deck) => (
        <PublicDeckCard key={deck.id} deck={deck} />
      ))}
    </div>
  );
}

function PublicDeckCard({ deck }: { deck: Deck }) {
  const previewCards = (deck.cards ?? []).slice(0, 3);

  return (
    <Link href={`/decks/${deck.id}`}>
      <Card className="group relative overflow-hidden h-full hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:-translate-y-1">
        <div className="aspect-[16/9] relative overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
          {previewCards.length > 0 ? (
            <div className="flex gap-2 justify-center items-center h-full">
              {previewCards.map((deckCard, index) => (
                <div
                  key={deckCard.id ?? index}
                  className="relative w-16 h-24 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    zIndex: index,
                    transform: `rotate(${(index - 1) * 10}deg) translateY(${Math.abs(index - 1) * 5}px)`,
                  }}
                >
                  {deckCard.card?.image ? (
                    <Image
                      src={`${deckCard.card.image}/high.webp`}
                      alt={deckCard.card.name || "Carte"}
                      fill
                      className="object-contain drop-shadow-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary/20 rounded border border-dashed border-secondary/40 flex items-center justify-center">
                      <Layers className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/20">
              <Layers className="w-12 h-12 opacity-20" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <Badge
            className="absolute top-3 right-3 z-20 bg-primary/90 hover:bg-primary backdrop-blur-md shadow-lg"
            variant="default"
          >
            {deck.format?.type || "Standard"}
          </Badge>
        </div>

        <div className="p-5">
          <h3 className="font-bold text-xl line-clamp-1 group-hover:text-primary transition-colors">
            {deck.name}
          </h3>
        </div>
      </Card>
    </Link>
  );
}
