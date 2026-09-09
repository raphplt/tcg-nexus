"use client";

import { useQuery } from "@tanstack/react-query";
import { Layers, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { decksService } from "@/services/decks.service";

interface DeckSimilarPanelProps {
  deckId: number;
}

/**
 * Cards mined from the decks closest to this one in archetype space.
 *
 * The justification shown to the user is the adoption rate itself — how many
 * similar decks run the card — because that is exactly what the query measured.
 */
export function DeckSimilarPanel({ deckId }: DeckSimilarPanelProps) {
  const t = useTranslations("DeckSimilar");

  const suggestions = useQuery({
    queryKey: ["deck-card-suggestions", deckId],
    queryFn: () => decksService.getCardSuggestions(deckId),
  });

  const similar = useQuery({
    queryKey: ["deck-similar", deckId],
    queryFn: () => decksService.getSimilarDecks(deckId),
  });

  const isLoading = suggestions.isPending || similar.isPending;

  if (isLoading) {
    return (
      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const cards = suggestions.data?.items ?? [];
  const decks = similar.data?.items ?? [];

  // An index that was never built is an installation state, not an error: the
  // panel says what is missing instead of showing an empty box.
  const unavailable =
    suggestions.data?.available === false || similar.data?.available === false;

  if (unavailable || (cards.length === 0 && decks.length === 0)) {
    const reason = suggestions.data?.reason ?? similar.data?.reason;
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {reason === "pgvector-missing"
            ? t("indexMissing")
            : reason === "deck-not-vectorized"
              ? t("deckNotVectorized")
              : t("noNeighbours")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {cards.length > 0 && (
          <ul className="space-y-2">
            {cards.map((card) => (
              <li
                key={card.cardId}
                className="flex items-center justify-between gap-3 rounded-md border p-2"
              >
                <span className="text-sm font-medium">
                  {card.name ?? card.cardId}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">
                    {t("adoption", { percentage: card.adoption })}
                  </Badge>
                  <Badge variant="outline">
                    {t("averageQty", { qty: card.averageQty })}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}

        {decks.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4" />
              {t("neighbours")}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {decks.map((deck) => (
                <li key={deck.deckId}>
                  <Link
                    href={`/decks/${deck.deckId}`}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm hover:bg-accent"
                  >
                    <span>{deck.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(deck.similarity * 100)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
