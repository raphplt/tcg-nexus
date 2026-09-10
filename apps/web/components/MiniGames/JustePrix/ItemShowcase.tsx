"use client";

import { Clock } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { JustePrixItem, JustePrixPublicItem } from "@/types/mini-game";
import { getCardImage } from "@/utils/images";
import { getSealedImageUrl, SEALED_PLACEHOLDER } from "@/utils/sealedImage";

interface ItemShowcaseProps {
  item: JustePrixItem | JustePrixPublicItem;
  round: number;
  totalRounds: number;
  /** Seconds left, shown as a badge when provided. */
  secondsLeft?: number | null;
}

/** Image of the item to price, with its kind, name and set. */
export function itemImage(item: JustePrixItem | JustePrixPublicItem): string {
  if (item.type === "card") return getCardImage(item.data);
  return getSealedImageUrl(item.data) || SEALED_PLACEHOLDER;
}

export function itemSetName(
  item: JustePrixItem | JustePrixPublicItem,
): string | undefined {
  return item.type === "card"
    ? item.data.set?.name
    : (item.data.pokemonSet?.name ?? undefined);
}

/** The thing to price: picture, kind, name and set, plus an optional timer. */
export function ItemShowcase({
  item,
  round,
  totalRounds,
  secondsLeft,
}: ItemShowcaseProps) {
  const t = useTranslations("JustePrix");
  const tc = useTranslations("MiniGames.common");
  const name = item.data.name || t("unknownName");

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm font-semibold">
        {tc("round", { round, total: totalRounds })}
      </div>
      <Card className="relative w-full max-w-64 overflow-hidden rounded-xl border border-border bg-zinc-800 shadow-md dark:bg-zinc-900">
        <CardContent className="relative flex aspect-[5/7] items-center justify-center p-4">
          {secondsLeft != null ? (
            <div
              className={`absolute right-2 top-2 z-30 flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-semibold ${
                secondsLeft <= 5
                  ? "border-red-500/30 bg-red-500/15 text-red-500"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {t("timeLeft", { seconds: secondsLeft })}
            </div>
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:12px_12px]" />
          <div className="relative h-full w-full">
            <Image
              src={itemImage(item)}
              alt={name}
              fill
              sizes="256px"
              className="object-contain"
            />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-1 text-center">
        <Badge variant="secondary" className="border border-border font-bold">
          {item.type === "card" ? t("collectionCard") : t("sealedProduct")}
        </Badge>
        <h3 className="max-w-xs truncate font-heading text-lg font-bold text-foreground">
          {name}
        </h3>
        <p className="text-xs text-muted-foreground">
          {itemSetName(item) || t("unknownSet")}
        </p>
      </div>
    </div>
  );
}
