"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Clock, LayoutGrid, Swords } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getPlayerName,
  TabMatchesProps,
} from "@/app/[locale]/(main)/tournaments/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusKeys: Record<string, string> = {
  scheduled: "statusScheduled",
  in_progress: "statusInProgress",
  finished: "statusFinished",
  forfeit: "statusForfeit",
  cancelled: "statusCancelled",
};

export function TabMatches({ matches, tournamentId }: TabMatchesProps) {
  const t = useTranslations("TabMatches");
  const visibleMatches = [...matches]
    .sort((a, b) => {
      const activeA = a.status === "in_progress" ? 0 : 1;
      const activeB = b.status === "in_progress" ? 0 : 1;
      return activeA - activeB || b.round - a.round || b.id - a.id;
    })
    .slice(0, 6);

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
          <Swords className="mb-4 size-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">{t("empty")}</h3>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            {t("generatedOnStart")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("matchTracking")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {tournamentId && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/tournaments/${tournamentId}/bracket`}>
                <LayoutGrid className="mr-2 size-4" />
                {t("viewBracket")}
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/tournaments/${tournamentId}/matches`}>
                {t("allMatches")}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {visibleMatches.map((match) => {
          const resultAvailable = ["finished", "forfeit"].includes(
            match.status,
          );
          return (
            <Link
              key={match.id}
              href={`/tournaments/${tournamentId}/matches/${match.id}`}
              className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/30"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  Ronde {match.round} · Match #{match.id}
                </div>
                <Badge
                  variant={
                    match.status === "in_progress" ? "default" : "outline"
                  }
                >
                  {(() => {
                    const key = statusKeys[match.status];
                    return key ? t(key) : match.status;
                  })()}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <span className="truncate font-medium">
                  {getPlayerName(match.playerA)}
                </span>
                <span className="font-mono text-sm font-semibold">
                  {resultAvailable
                    ? `${match.playerAScore ?? 0} – ${match.playerBScore ?? 0}`
                    : "vs"}
                </span>
                <span className="truncate text-right font-medium">
                  {getPlayerName(match.playerB)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
