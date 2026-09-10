"use client";

import { ChevronRight, LayoutGrid, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/SmartImage";
import type { CatalogNavigation } from "@/hooks/useCatalogNavigation";
import type { PokemonSerieType, PokemonSetType } from "@/types/cardPokemon";
import { getSeriesLogo, getSetLogo, getSetSymbol } from "@/utils/images";

const TILE_GRID =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,9.5rem),1fr))] gap-2";
const TILE =
  "group flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const releaseYear = (set?: PokemonSetType) => set?.releaseDate?.slice(0, 4);

/** Logo area shared by series and set tiles. */
const TileLogo: React.FC<{ src?: string; children?: React.ReactNode }> = ({
  src,
  children,
}) => (
  <span className="relative block aspect-2/1 bg-muted/40">
    {src ? (
      <SmartImage
        src={src}
        alt=""
        className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
      />
    ) : (
      <span className="flex h-full items-center justify-center text-muted-foreground">
        <Layers className="h-6 w-6" />
      </span>
    )}
    {children}
  </span>
);

interface CatalogBrowserProps {
  series?: PokemonSerieType[];
  sets?: PokemonSetType[];
  serieId?: string;
  onSelectSerie: (serieId: string) => void;
  onSelectSet: (set: PokemonSetType) => void;
}

/** Series tiles, or the set tiles of the chosen series. */
export function CatalogBrowser({
  series,
  sets,
  serieId,
  onSelectSerie,
  onSelectSet,
}: CatalogBrowserProps) {
  const t = useTranslations("CatalogExplorer");

  // Sets arrive newest first, so each series keeps that order.
  const setsBySerie = useMemo(() => {
    const grouped = new Map<string, PokemonSetType[]>();
    for (const set of sets ?? []) {
      if (!set.serie?.id) continue;
      const serieSets = grouped.get(set.serie.id);
      if (serieSets) serieSets.push(set);
      else grouped.set(set.serie.id, [set]);
    }
    return grouped;
  }, [sets]);

  const orderedSeries = useMemo(
    () =>
      (series ?? [])
        .filter((serie) => setsBySerie.has(serie.id))
        .sort((a, b) =>
          (setsBySerie.get(b.id)?.[0]?.releaseDate ?? "").localeCompare(
            setsBySerie.get(a.id)?.[0]?.releaseDate ?? "",
          ),
        ),
    [series, setsBySerie],
  );

  if (!series || !sets) {
    return (
      <div className={TILE_GRID}>
        {Array.from({ length: 8 }).map((_: unknown, i: number) => (
          <div
            key={i}
            className="aspect-4/3 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    );
  }

  if (!serieId) {
    return (
      <div className={TILE_GRID}>
        {orderedSeries.map((serie) => {
          const serieSets = setsBySerie.get(serie.id) ?? [];
          const newest = releaseYear(serieSets[0]);
          const oldest = releaseYear(serieSets[serieSets.length - 1]);
          const years =
            oldest && oldest !== newest ? `${oldest}–${newest}` : newest;
          return (
            <button
              key={serie.id}
              type="button"
              className={TILE}
              onClick={() => onSelectSerie(serie.id)}
            >
              <TileLogo src={getSeriesLogo(serie)} />
              <span className="flex flex-col gap-0.5 p-2">
                <span className="line-clamp-1 text-xs font-semibold">
                  {serie.name}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {t("setCount", { count: serieSets.length })}
                  {years && ` · ${years}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  const serieSets = setsBySerie.get(serieId) ?? [];
  if (!serieSets.length) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {t("noSets")}
      </p>
    );
  }

  return (
    <div className={TILE_GRID}>
      {serieSets.map((set) => {
        const symbol = getSetSymbol(set);
        const cardCount = set.cardCount?.official || set.cardCount?.total;
        return (
          <button
            key={set.id}
            type="button"
            className={TILE}
            onClick={() => onSelectSet(set)}
          >
            <TileLogo src={getSetLogo(set) ?? symbol}>
              {set.legal?.standard && (
                <Badge className="absolute right-1 top-1 px-1.5 py-0 text-[10px]">
                  {t("standardLegal")}
                </Badge>
              )}
            </TileLogo>
            <span className="flex flex-col gap-0.5 p-2">
              <span className="flex min-w-0 items-center gap-1.5">
                {symbol && (
                  <span className="relative h-4 w-4 shrink-0">
                    <SmartImage
                      src={symbol}
                      alt=""
                      noSkeleton
                      className="h-full w-full object-contain"
                    />
                  </span>
                )}
                <span className="line-clamp-1 text-xs font-semibold">
                  {set.name}
                </span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                {[
                  releaseYear(set),
                  cardCount ? t("cardCount", { count: cardCount }) : undefined,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface CatalogBreadcrumbProps {
  serie?: PokemonSerieType;
  set?: PokemonSetType;
  showAllCards: boolean;
  onRoot: () => void;
  onSerie: (serieId: string) => void;
}

/** Shows where the user is in the catalogue and lets them step back up. */
export function CatalogBreadcrumb({
  serie,
  set,
  showAllCards,
  onRoot,
  onSerie,
}: CatalogBreadcrumbProps) {
  const t = useTranslations("CatalogExplorer");

  const crumbs: { key: string; label?: string; onClick?: () => void }[] = [
    { key: "root", label: t("series"), onClick: onRoot },
  ];
  if (serie) {
    crumbs.push({
      key: "serie",
      label: serie.name,
      onClick: () => onSerie(serie.id),
    });
  }
  if (set) crumbs.push({ key: "set", label: set.name });
  else if (showAllCards) crumbs.push({ key: "all", label: t("allCards") });

  return (
    <nav aria-label={t("breadcrumb")} className="min-w-0">
      <ol className="flex flex-wrap items-center gap-0.5 text-sm">
        {crumbs.map((crumb, index) => (
          <li key={crumb.key} className="flex min-w-0 items-center gap-0.5">
            {index > 0 && (
              <ChevronRight
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              />
            )}
            {index === crumbs.length - 1 ? (
              <span
                aria-current="page"
                className="truncate px-1.5 font-semibold"
              >
                {crumb.label}
              </span>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 text-muted-foreground hover:text-foreground"
                onClick={crumb.onClick}
              >
                {crumb.label}
              </Button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface CatalogExplorerProps {
  nav: CatalogNavigation;
  series?: PokemonSerieType[];
  sets?: PokemonSetType[];
  /** Card list shown once a set, a search or a filter narrows the catalogue. */
  children: React.ReactNode;
}

/** Series → sets → cards navigation wrapped around a card list. */
export function CatalogExplorer({
  nav,
  series,
  sets,
  children,
}: CatalogExplorerProps) {
  const t = useTranslations("CatalogExplorer");
  const currentSet = sets?.find((set) => set.id === nav.setId);
  const currentSerie = series?.find(
    (serie) => serie.id === (nav.serieId ?? currentSet?.serie?.id),
  );

  return (
    <div className="space-y-3">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        <CatalogBreadcrumb
          serie={currentSerie}
          set={currentSet}
          showAllCards={nav.showAllCards}
          onRoot={() => nav.browseSerie()}
          onSerie={nav.browseSerie}
        />
        {nav.isBrowsing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-foreground"
            onClick={nav.showAll}
          >
            <LayoutGrid className="h-4 w-4" />
            {nav.serieId ? t("serieAllCards") : t("allCards")}
          </Button>
        )}
      </div>
      {nav.isBrowsing ? (
        <CatalogBrowser
          series={series}
          sets={sets}
          serieId={nav.serieId}
          onSelectSerie={nav.browseSerie}
          onSelectSet={nav.browseSet}
        />
      ) : (
        children
      )}
    </div>
  );
}
