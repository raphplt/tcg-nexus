"use client";

import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Layers, Trophy } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { FeedItem } from "@/types/feed";

interface FeedItemCardProps {
  item: FeedItem;
}

export function FeedItemCard({ item }: FeedItemCardProps) {
  const actorName = `${item.actor.firstName} ${item.actor.lastName}`.trim();
  const initials =
    `${item.actor.firstName[0] ?? ""}${item.actor.lastName[0] ?? ""}`.toUpperCase();
  const when = formatDistanceToNow(new Date(item.createdAt), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <Card className="p-4 flex items-start gap-4 hover:shadow-md transition-shadow">
      <Link href={`/users/${item.actor.id}`}>
        <Avatar className="h-12 w-12">
          <AvatarImage
            src={item.actor.avatarUrl ?? undefined}
            alt={actorName}
          />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 space-y-1">
        <div className="text-sm">
          <Link
            href={`/users/${item.actor.id}`}
            className="font-semibold hover:text-primary hover:underline transition-colors"
          >
            {actorName}
          </Link>{" "}
          {item.type === "deck_created" && (
            <span className="text-muted-foreground">a publié un deck</span>
          )}
          {item.type === "tournament_joined" && (
            <span className="text-muted-foreground">a rejoint un tournoi</span>
          )}
        </div>

        {item.type === "deck_created" && item.deck && (
          <Link
            href={`/decks/${item.deck.id}`}
            className="block p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span className="font-medium">{item.deck.name}</span>
              {item.deck.format?.type && (
                <Badge variant="secondary" className="ml-auto">
                  {item.deck.format.type}
                </Badge>
              )}
            </div>
          </Link>
        )}

        {item.type === "tournament_joined" && item.tournament && (
          <Link
            href={`/tournaments/${item.tournament.id}`}
            className="block p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{item.tournament.name}</span>
            </div>
          </Link>
        )}

        <p className="text-xs text-muted-foreground">{when}</p>
      </div>
    </Card>
  );
}
