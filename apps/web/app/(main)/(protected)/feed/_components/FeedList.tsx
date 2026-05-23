"use client";

import { useQuery } from "@tanstack/react-query";
import { Rss } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { feedService } from "@/services/feed.service";
import { FeedItemCard } from "./FeedItemCard";

export function FeedList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["feed"],
    queryFn: () => feedService.getFeed(),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">Erreur de chargement du feed</p>
    );
  }
  if (!data || data.length === 0) {
    return (
      <Card className="p-8 flex flex-col items-center text-center gap-3">
        <Rss className="h-10 w-10 text-muted-foreground/40" />
        <h3 className="text-lg font-semibold">Aucune activité récente</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Suivez d&apos;autres joueurs pour voir leurs decks publiés et leurs
          inscriptions à des tournois ici.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <FeedItemCard key={`${item.type}-${idx}-${item.createdAt}`} item={item} />
      ))}
    </div>
  );
}
