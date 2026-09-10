"use client";

import { useQuery } from "@tanstack/react-query";
import { Crown, Flame, Globe, Layers, Package, User, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { ModeCard } from "@/components/MiniGames/ModeCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { H3 } from "@/components/Shared/Titles";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type { PokemonSetType } from "@/types/cardPokemon";
import { PACK_STYLES, type PackStyle } from "@/types/mini-game";

export type ScopeKind = "all" | "serie" | "set";

export interface DuelOptions {
  scope: ScopeKind;
  serieId: string;
  setId: string;
  style: PackStyle;
  roundCount: number;
}

export const DEFAULT_DUEL_OPTIONS: DuelOptions = {
  scope: "all",
  serieId: "",
  setId: "",
  style: "standard",
  roundCount: 3,
};

const ROUND_OPTIONS = [1, 3, 5] as const;

const STYLE_META: Record<
  PackStyle,
  { icon: typeof Package; labelKey: string; helpKey: string; size: number; accent: string }
> = {
  standard: {
    icon: Package,
    labelKey: "styleStandard",
    helpKey: "styleStandardHelp",
    size: 6,
    accent: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  premium: {
    icon: Crown,
    labelKey: "stylePremium",
    helpKey: "stylePremiumHelp",
    size: 6,
    accent: "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  chase: {
    icon: Flame,
    labelKey: "styleChase",
    helpKey: "styleChaseHelp",
    size: 3,
    accent: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

interface DuelSetupProps {
  options: DuelOptions;
  onChange: (options: DuelOptions) => void;
  onStart: (mode: "solo" | "local" | "online") => void;
  isAuthenticated: boolean;
}

/** Start screen: what to open, which booster type, how many, against whom. */
export function DuelSetup({ options, onChange, onStart, isAuthenticated }: DuelSetupProps) {
  const t = useTranslations("CaseOpening");
  const tm = useTranslations("MiniGames");

  const { data: series = [] } = useQuery({
    queryKey: ["pokemon-series"],
    queryFn: () => pokemonCardService.getAllSeries(),
  });
  const { data: sets = [] } = useQuery({
    queryKey: ["pokemon-set", "all"],
    queryFn: () => pokemonCardService.getAllSets(),
  });

  const setsOfSerie = useMemo(
    () =>
      options.serieId
        ? sets.filter((set: PokemonSetType) => set.serie?.id === options.serieId)
        : [],
    [sets, options.serieId],
  );

  const update = (patch: Partial<DuelOptions>) => onChange({ ...options, ...patch });

  const selectScope = (scope: ScopeKind) =>
    update({ scope, setId: scope === "set" ? options.setId : "" });

  const canStart =
    options.scope === "all" ||
    (options.scope === "serie" && options.serieId !== "") ||
    (options.scope === "set" && options.setId !== "");

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-4">
      <Card className="tcg-surface bg-card shadow-sm">
        <CardContent className="space-y-6 p-6">
          <H3 className="font-heading text-lg font-bold text-foreground">{t("setup")}</H3>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">{t("scope")}</p>
            <div className="flex flex-wrap gap-2">
              {(["all", "serie", "set"] as ScopeKind[]).map((scope) => (
                <Button
                  key={scope}
                  type="button"
                  size="sm"
                  variant={options.scope === scope ? "default" : "outline"}
                  onClick={() => selectScope(scope)}
                  className="font-semibold"
                >
                  <Layers className="mr-1.5 h-3.5 w-3.5" />
                  {scope === "all"
                    ? t("scopeAll")
                    : scope === "serie"
                      ? t("scopeSerie")
                      : t("scopeSet")}
                </Button>
              ))}
            </div>

            {options.scope !== "all" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  value={options.serieId}
                  onValueChange={(serieId) => update({ serieId, setId: "" })}
                >
                  <SelectTrigger
                    aria-label={t("chooseSerie")}
                    className="bg-background font-semibold"
                  >
                    <SelectValue placeholder={t("chooseSerie")} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover font-semibold">
                    {series.map((serie) => (
                      <SelectItem key={serie.id} value={serie.id}>
                        {serie.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {options.scope === "set" ? (
                  <Select
                    value={options.setId}
                    onValueChange={(setId) => update({ setId })}
                    disabled={!options.serieId}
                  >
                    <SelectTrigger
                      aria-label={t("chooseSet")}
                      className="bg-background font-semibold"
                    >
                      <SelectValue placeholder={t("chooseSet")} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover font-semibold">
                      {setsOfSerie.map((set) => (
                        <SelectItem key={set.id} value={set.id}>
                          {set.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="self-center text-xs text-muted-foreground">
                    {options.serieId ? t("allSetsOfSerie") : ""}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">{t("style")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PACK_STYLES.map((style) => {
                const meta = STYLE_META[style];
                const Icon = meta.icon;
                const selected = options.style === style;
                return (
                  <button
                    key={style}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update({ style })}
                    className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
                      selected
                        ? `${meta.accent} ring-2 ring-primary/40`
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-heading text-sm font-bold">
                        <Icon className="h-4 w-4" />
                        {t(meta.labelKey)}
                      </span>
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                        {t("cardsPerPack", { count: meta.size })}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t(meta.helpKey)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label
              htmlFor="case-opening-rounds"
              className="text-xs font-semibold text-muted-foreground"
            >
              {t("roundCount")}
            </label>
            <Select
              value={String(options.roundCount)}
              onValueChange={(value) => update({ roundCount: Number(value) })}
            >
              <SelectTrigger id="case-opening-rounds" className="w-40 bg-background font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover font-semibold">
                {ROUND_OPTIONS.map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    {t("roundsOption", { count })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <ModeCard
          icon={<User className="h-10 w-10" />}
          title={t("solo")}
          help={t("soloHelp")}
          cta={t("playSolo")}
          accent="amber"
          disabled={!canStart}
          onSelect={() => onStart("solo")}
        />
        <ModeCard
          icon={<Users className="h-10 w-10" />}
          title={t("local")}
          help={t("localHelp")}
          cta={t("playLocal")}
          accent="blue"
          disabled={!canStart}
          onSelect={() => onStart("local")}
        />
        <ModeCard
          icon={<Globe className="h-10 w-10" />}
          title={t("online")}
          help={t("onlineHelp")}
          cta={t("playOnline")}
          accent="purple"
          hint={isAuthenticated ? undefined : tm("loginRequiredBadge")}
          disabled={!canStart}
          onSelect={() => onStart("online")}
        />
      </div>
    </div>
  );
}
