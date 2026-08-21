"use client";

import { useTranslations } from "next-intl";
import { Crown, Minus } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BracketMatch, BracketStructure } from "@/types/tournament";

interface RoundsScheduleProps {
  bracket: BracketStructure;
  currentRound?: number;
  onMatchClick?: (matchId: number) => void;
  interactive?: boolean;
}

/** Renders a single duel of a round, including byes and reported scores. */
function PairingRow({
  match,
  onClick,
  interactive,
}: {
  match: BracketMatch;
  onClick?: (matchId: number) => void;
  interactive: boolean;
}) {
  const t = useTranslations("RoundsSchedule");
  const isBye = !match.playerA || !match.playerB;
  const isPlayed = match.status === "finished" || match.status === "forfeit";
  const clickable = interactive && Boolean(match.matchId) && !isBye;

  const playerCell = (
    player: BracketMatch["playerA"],
    align: "left" | "right",
  ) => (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <span
        className={cn(
          "truncate text-sm",
          match.winnerId === player?.id && "font-semibold",
        )}
      >
        {player?.name || t("bye")}
      </span>
      {match.winnerId === player?.id && !isBye && (
        <Crown className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2",
        isBye
          ? "border-dashed border-border bg-muted/30"
          : isPlayed
            ? "border-emerald-500/40 bg-emerald-500/5"
            : match.status === "in_progress"
              ? "border-primary/60 bg-primary/5"
              : "border-border bg-card",
        clickable && "cursor-pointer transition-colors hover:bg-muted/60",
      )}
      onClick={() => {
        if (clickable && match.matchId && onClick) {
          onClick(match.matchId);
        }
      }}
    >
      {playerCell(match.playerA, "left")}

      <div className="shrink-0 text-center">
        {isBye ? (
          <Badge variant="outline" className="text-xs">
            {t("bye")}
          </Badge>
        ) : isPlayed ? (
          <span className="text-sm font-semibold tabular-nums">
            {match.playerAScore ?? 0} – {match.playerBScore ?? 0}
          </span>
        ) : (
          <Minus className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {playerCell(match.playerB, "right")}
    </div>
  );
}

/**
 * Displays the pairings round by round.
 *
 * Used by formats without an elimination tree (round robin, Swiss): every
 * round is a flat list of duels, with no bracket progression. Swiss rounds
 * that are not paired yet are rendered as a pending placeholder.
 */
export function RoundsSchedule({
  bracket,
  currentRound,
  onMatchClick,
  interactive = true,
}: RoundsScheduleProps) {
  const t = useTranslations("RoundsSchedule");

  if (!bracket || bracket.rounds.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  // Swiss pairings depend on the standings, so only the rounds played so far
  // exist: the remaining ones are shown as pending rather than omitted.
  const pendingRounds = Math.max(
    0,
    bracket.totalRounds - bracket.rounds.length,
  );
  const liveRound = currentRound ?? bracket.rounds.length;

  return (
    <div className="space-y-4">
      {bracket.totalRounds > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("progress", {
            current: Math.min(liveRound, bracket.totalRounds),
            total: bracket.totalRounds,
          })}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bracket.rounds.map((round) => {
          const isCurrent = round.index === currentRound;
          const playedCount = round.matches.filter(
            (match) =>
              match.status === "finished" || match.status === "forfeit",
          ).length;

          return (
            <Card
              key={round.index}
              className={cn(isCurrent && "border-primary/60 shadow-sm")}
            >
              <CardContent className="space-y-2 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-semibold">
                    {t("round", { index: round.index })}
                  </h3>
                  {isCurrent ? (
                    <Badge>{t("current")}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {playedCount}/{round.matches.length}
                    </span>
                  )}
                </div>

                {round.matches.map((match) => (
                  <PairingRow
                    key={match.matchId ?? `${round.index}-${match.position}`}
                    match={match}
                    onClick={onMatchClick}
                    interactive={interactive}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })}

        {pendingRounds > 0 && (
          <Card className="border-dashed">
            <CardContent className="flex h-full min-h-32 flex-col items-center justify-center p-4 text-center">
              <h3 className="font-semibold">
                {t("round", { index: bracket.rounds.length + 1 })}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("pendingPairings")}
              </p>
              {pendingRounds > 1 && (
                <span className="mt-2 text-xs text-muted-foreground">
                  {t("remainingRounds", { count: pendingRounds })}
                </span>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
