"use client";

import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import { Layers, Sparkles, Target, Trophy } from "lucide-react";
import type { Collection } from "@/types/collection";
import { getCompletionPercent } from "@/utils/collection";

interface CollectionsOverviewProps {
  collections: Collection[];
}

/** Total number of card copies held across every collection. */
function countCopies(collections: Collection[]): number {
  return collections.reduce(
    (total, collection) =>
      total +
      (collection.items ?? []).reduce(
        (sum, item) => sum + (item.quantity || 0),
        0,
      ),
    0,
  );
}

/** Average completion of the tracked Master Sets, or null when none is tracked. */
function averageCompletion(masterSets: Collection[]): number | null {
  if (masterSets.length === 0) return null;
  const total = masterSets.reduce(
    (sum, collection) => sum + getCompletionPercent(collection),
    0,
  );
  return Math.round(total / masterSets.length);
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="tcg-metric-card flex flex-col items-start gap-2 sm:min-w-[160px] sm:flex-1 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground sm:h-10 sm:w-10">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]">
          {label}
        </p>
        <p className="font-heading text-xl font-bold leading-none tabular-nums">
          {value}
        </p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          {detail}
        </p>
      </div>
    </div>
  );
}

/** Key figures of a trainer's collections, shown under the page header. */
export function CollectionsOverview({ collections }: CollectionsOverviewProps) {
  const t = useTranslations("Collections.stats");
  const masterSets = collections.filter((collection) => collection.masterSet);
  const completion = averageCompletion(masterSets);

  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
      <Metric
        icon={Layers}
        label={t("collections")}
        value={String(collections.length)}
        detail={t("collectionsDetail")}
      />
      <Metric
        icon={Sparkles}
        label={t("cards")}
        value={String(countCopies(collections))}
        detail={t("cardsDetail")}
      />
      <Metric
        icon={Trophy}
        label={t("masterSets")}
        value={String(masterSets.length)}
        detail={t("masterSetsDetail")}
      />
      <Metric
        icon={Target}
        label={t("completion")}
        value={completion === null ? "—" : `${completion}%`}
        detail={t("completionDetail")}
      />
    </div>
  );
}
