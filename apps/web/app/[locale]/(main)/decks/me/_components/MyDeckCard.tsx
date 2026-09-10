"use client";

import {
  Download,
  Eye,
  Globe2,
  Layers,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Deck } from "@/types/Decks";

interface MyDeckCardProps {
  deck: Deck;
  layout: "grid" | "list";
  exporting: boolean;
  onExport: (deck: Deck) => void;
  onDelete: (deck: Deck) => void;
}

function CardArtwork({ image, name }: { image: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <Layers className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
  ) : (
    <Image
      src={`${image}/high.webp`}
      alt={name}
      fill
      sizes="120px"
      className="object-contain drop-shadow-lg"
      onError={() => setFailed(true)}
    />
  );
}

/** Renders an owned deck with artwork and keyboard-accessible management actions. */
export function MyDeckCard({
  deck,
  layout,
  exporting,
  onExport,
  onDelete,
}: MyDeckCardProps) {
  const t = useTranslations("MyDecks");
  const formatter = useFormatter();
  const previews = (deck.cards ?? [])
    .flatMap(({ card }) =>
      card?.image ? [{ image: card.image, name: card.name ?? "" }] : [],
    )
    .slice(0, 3);
  if (!previews.length && deck.coverCard?.image) previews.push(deck.coverCard);
  const count = deck.cards?.reduce((total, card) => total + card.qty, 0);
  const updated = new Date(deck.updatedAt ?? deck.createdAt);
  const list = layout === "list";

  return (
    <article
      className={cn(
        "tcg-surface group overflow-hidden transition-colors hover:border-primary/40",
        list && "sm:flex sm:items-center",
      )}
    >
      <Link
        href={`/decks/${deck.id}`}
        aria-label={t("openDeck", { name: deck.name })}
        className={cn(
          "relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-muted/50 to-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
          list && "hidden sm:flex sm:h-36 sm:w-40 sm:shrink-0",
        )}
      >
        {previews.length ? (
          previews.map((card, index) => (
            <div
              key={`${card.image}-${index}`}
              className={cn(
                "relative flex h-36 w-24 shrink-0 items-center justify-center motion-safe:transition-transform motion-safe:group-hover:-translate-y-1",
                index > 0 && "-ml-9",
                list && "h-28 w-20",
              )}
              style={{
                rotate: `${(index - (previews.length - 1) / 2) * 12}deg`,
                zIndex: index,
              }}
            >
              <CardArtwork image={card.image} name={card.name} />
            </div>
          ))
        ) : (
          <Layers className="h-16 w-16 text-primary/20" aria-hidden="true" />
        )}
      </Link>
      <div className="min-w-0 flex-1 space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary">
                {deck.format?.type ?? t("unknownFormat")}
              </Badge>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {deck.isPublic ? (
                  <Globe2 className="h-3.5 w-3.5" />
                ) : (
                  <LockKeyhole className="h-3.5 w-3.5" />
                )}
                {t(deck.isPublic ? "public" : "private")}
              </span>
            </div>
            <h2 className="font-heading text-lg font-bold leading-snug">
              <Link
                href={`/decks/${deck.id}`}
                className="line-clamp-2 break-words hover:text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {deck.name}
              </Link>
            </h2>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label={t("actions", { name: deck.name })}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={exporting}
                onSelect={() => onExport(deck)}
              >
                <Download className="mr-2 h-4 w-4" />
                {t(exporting ? "exporting" : "export")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onDelete(deck)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {count !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              {t("cards", { count })}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {t("views", { count: deck.views ?? 0 })}
          </span>
        </div>
        {!Number.isNaN(updated.getTime()) && (
          <p className="text-xs text-muted-foreground">
            {t("updated", {
              date: formatter.dateTime(updated, {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            })}
          </p>
        )}
        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href={`/decks/${deck.id}/update`}>
              <Pencil />
              {t("edit")}
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="flex-1 text-primary"
          >
            <Link href={`/decks/${deck.id}/analysis`}>
              <Sparkles />
              {t("analyze")}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
