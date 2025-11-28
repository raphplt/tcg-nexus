"use client";
import React from "react";
import { H2 } from "../Shared/Titles";
import { Card } from "../ui/card";
import Image from "next/image";
import { Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { decksService } from "@/services/decks.service";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";

const TrendingDecks = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["decks", "trending"],
    queryFn: () =>
      decksService.getPaginated({
        limit: 6,
        sortBy: "createdAt",
        sortOrder: "DESC",
      }),
  });

  if (isLoading) {
    return (
      <Card className="bg-card rounded-xl shadow p-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <H2>Derniers Decks</H2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-lg border bg-background"
            >
              <Skeleton className="w-12 h-12 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const decks = data?.data || [];

  return (
    <Card className="bg-card rounded-xl shadow p-6 mt-8 card-hover">
      <div className="flex items-center justify-between mb-4">
        <H2>Derniers Decks</H2>
        <Link
          href="/decks"
          className="text-sm text-primary hover:underline"
        >
          Voir tout
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {decks.length > 0 ? (
          decks.map((deck) => (
            <Link
              href={`/decks/${deck.id}`}
              key={deck.id}
              className="flex items-center gap-4 p-3 rounded-lg border bg-background hover:shadow-md transition group"
            >
              <div className="flex-shrink-0">
                {deck.cards &&
                deck.cards.length > 0 &&
                deck.cards[0]?.card?.image ? (
                  <Image
                    src={deck.cards[0].card.image}
                    alt={deck.name}
                    width={48}
                    height={66}
                    className="object-contain rounded border group-hover:scale-105 transition-transform bg-muted"
                  />
                ) : (
                  <div className="w-12 h-[66px] bg-muted rounded flex items-center justify-center border group-hover:scale-105 transition-transform">
                    <Layers className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{deck.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {deck.format?.type || "Format inconnu"} • Par{" "}
                  {deck.user?.firstName || "Anonyme"}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-2 text-center text-muted-foreground py-8">
            Aucun deck trouvé.
          </div>
        )}
      </div>
    </Card>
  );
};

export default TrendingDecks;
