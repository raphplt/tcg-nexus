"use client";
import React from "react";
import { H2 } from "../Shared/Titles";
import { Card } from "../ui/card";
import Image from "next/image";
import { Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { decksService } from "@/services/decks.service";
import { getCardImage } from "@/utils/images";
import type { Deck } from "@/types/Decks";
import { Link } from "@/i18n/navigation";
import { Skeleton } from "../ui/skeleton";
import { useTranslations } from "next-intl";

/**
 * Picks the artwork representing a deck. The cover card comes first, then the
 * first card actually carrying an image: artwork is missing on a few cards, and
 * `cards[0]` would otherwise leave the deck without any visual.
 *
 * @param deck - Deck to illustrate.
 * @returns Card image URL, or undefined when none is available.
 */
const getDeckCover = (deck: Deck): string | undefined => {
  if (deck.coverCard?.image) return getCardImage(deck.coverCard, "low");

  const illustratedCard = deck.cards?.find((deckCard) => deckCard.card?.image);
  return illustratedCard
    ? getCardImage(illustratedCard.card, "low")
    : undefined;
};

const TrendingDecks = () => {
  const t = useTranslations("Home");
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
      <Card className="p-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <H2>{t("decks.latest")}</H2>
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
    <Card className="p-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <H2>{t("decks.best")}</H2>
        <Link href="/decks" className="text-sm text-primary hover:underline">
          {t("decks.viewAll")}
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {decks.length > 0 ? (
          decks.map((deck) => {
            const cover = getDeckCover(deck);
            return (
              <Link
                href={`/decks/${deck.id}`}
                key={deck.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-background hover:shadow-md transition group"
              >
                <div className="shrink-0">
                  {cover ? (
                    <Image
                      src={cover}
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
                    {t("decks.by", {
                      format: deck.format?.type || t("decks.unknownFormat"),
                      author: deck.user?.firstName || t("decks.anonymous"),
                    })}
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="col-span-2 text-center text-muted-foreground py-8">
            {t("decks.empty")}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TrendingDecks;
