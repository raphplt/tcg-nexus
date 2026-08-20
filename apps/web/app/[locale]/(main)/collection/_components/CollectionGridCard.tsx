"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, Eye, Lock, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/i18n/navigation";
import type { Collection } from "@/types/collection";
import { getSetImage } from "@/utils/images";
import {
  getCollectionTarget,
  getCollectionTitle,
  getCompletionPercent,
  getOwnedCardCount,
  getPreviewCards,
} from "@/utils/collection";
import { CollectionCardFan } from "./CollectionCardFan";
import { CompletionRing } from "./CompletionRing";

interface CollectionGridCardProps {
  collection: Collection;
}

/** Release year of an extension, used as a discreet subtitle. */
function releaseYear(releaseDate?: string): string | undefined {
  const year = releaseDate?.slice(0, 4);
  return year && /^\d{4}$/.test(year) ? year : undefined;
}

/**
 * Master Set tile: the extension logo, a completion ring and the card count
 * still missing before the set is complete.
 */
function MasterSetCard({ collection }: CollectionGridCardProps) {
  const t = useTranslations("Collections");
  const owned = getOwnedCardCount(collection);
  const target = getCollectionTarget(collection);
  const percent = getCompletionPercent(collection);
  const logo = getSetImage(collection.masterSet);
  const year = releaseYear(collection.masterSet?.releaseDate);

  return (
    <Link
      href={`/collection/${collection.id}`}
      className="collection-grid-item group tcg-surface tcg-surface--hover collection-tile flex flex-col overflow-hidden"
    >
      <div className="collection-tile-banner collection-tile-banner--master relative flex h-32 items-center justify-center px-6">
        {logo ? (
          <Image
            src={logo}
            alt={collection.masterSet?.name ?? t("masterSets.title")}
            width={220}
            height={90}
            className="max-h-16 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Trophy className="h-10 w-10 text-amber-500/70" />
        )}
        <div className="absolute right-3 top-3">
          <CompletionRing percent={percent} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-500">
            {t("masterSets.badge")}
            {year ? ` · ${year}` : ""}
          </p>
          <h3 className="line-clamp-1 font-heading text-lg font-bold text-foreground transition-colors group-hover:text-primary">
            {collection.masterSet?.name ?? getCollectionTitle(collection)}
          </h3>
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">
              {t("masterSets.progress")}
            </span>
            <span className="font-bold tabular-nums text-foreground">
              {owned} / {target}
            </span>
          </div>
          <Progress
            value={percent}
            className="h-1.5 bg-muted [&>div]:bg-amber-500"
          />
          <p className="text-xs text-muted-foreground">
            {percent >= 100
              ? t("masterSets.complete")
              : t("masterSets.remaining", {
                  count: Math.max(0, target - owned),
                })}
          </p>
        </div>

        <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          {t("openMasterSet")}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/**
 * Personal collection tile: a fan of the cards it holds, its visibility and how
 * many cards it gathers.
 */
function PersonalCollectionCard({ collection }: CollectionGridCardProps) {
  const t = useTranslations("Collections");
  const owned = getOwnedCardCount(collection);

  return (
    <Link
      href={`/collection/${collection.id}`}
      className="collection-grid-item group tcg-surface tcg-surface--hover collection-tile flex flex-col overflow-hidden"
    >
      <div className="collection-tile-banner relative">
        <CollectionCardFan
          cards={getPreviewCards(collection)}
          emptyLabel={t("pokemonCard")}
        />
        <Badge
          variant="outline"
          className="absolute right-3 top-3 bg-background/85 text-[11px] backdrop-blur-sm"
        >
          {collection.isPublic ? (
            <Eye className="mr-1 h-3 w-3" />
          ) : (
            <Lock className="mr-1 h-3 w-3" />
          )}
          {collection.isPublic ? t("public") : t("private")}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-heading text-lg font-bold text-foreground transition-colors group-hover:text-primary">
          {collection.name}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {collection.description || t("noDescription")}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="chip text-xs">
            {t("cardsOwned", { count: owned })}
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            {t("view")}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Renders a collection as a grid tile, picking the Master Set layout when the
 * collection tracks a whole extension.
 */
export function CollectionGridCard({ collection }: CollectionGridCardProps) {
  return collection.masterSet ? (
    <MasterSetCard collection={collection} />
  ) : (
    <PersonalCollectionCard collection={collection} />
  );
}
