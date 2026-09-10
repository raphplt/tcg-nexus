"use client";

import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Clock,
  Crown,
  Edit,
  ExternalLink,
  PlayCircle,
  Swords,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import React from "react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Match } from "@/types/tournament";

interface AdminRoundCardProps {
  roundNumber: number;
  totalRounds: number;
  tournamentId: number;
  tournamentType: string;
  tournamentStatus: string;
  currentRound?: number;
  matches: Match[];
  onStartMatch: (match: Match) => void;
  onEditScore: (match: Match) => void;
  onBulkStart?: (matchIds: number[]) => void;
  isBulkStarting?: boolean;
}

const statusConfig: Record<
  string,
  { labelKey: string; icon: React.ReactNode; color: string }
> = {
  scheduled: {
    labelKey: "statusScheduled",
    icon: <Clock className="size-3" />,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  in_progress: {
    labelKey: "statusInProgress",
    icon: <PlayCircle className="size-3" />,
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  finished: {
    labelKey: "statusFinished",
    icon: <CheckCircle2 className="size-3" />,
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  forfeit: {
    labelKey: "statusForfeit",
    icon: <XCircle className="size-3" />,
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  },
  cancelled: {
    labelKey: "statusCancelled",
    icon: <XCircle className="size-3" />,
    color: "bg-red-500/10 text-red-500 border-red-500/20",
  },
};

/**
 * Formats a player's display name from their record or user information.
 *
 * @param player - Player object with optional user relation.
 * @returns Human-readable player name.
 */
function getPlayerDisplayName(player: any): string | null {
  if (!player) return null;
  if (player.user) {
    const fullName = `${player.user.firstName || ""} ${player.user.lastName || ""}`.trim();
    if (fullName) return fullName;
    if (player.user.email) return player.user.email;
  }
  return player.name || `Joueur #${player.id}`;
}

/**
 * Component representing a single tournament round in the admin view.
 * Renders round progress, format-aware phase headers, matches table, and actions.
 */
export function AdminRoundCard({
  roundNumber,
  totalRounds,
  tournamentId,
  tournamentType,
  tournamentStatus,
  currentRound,
  matches,
  onStartMatch,
  onEditScore,
  onBulkStart,
  isBulkStarting = false,
}: AdminRoundCardProps) {
  const t = useTranslations("MatchManager");

  const isElimination =
    tournamentType === "single_elimination" ||
    tournamentType === "double_elimination";

  const getRoundTitle = () => {
    if (isElimination && totalRounds > 0) {
      if (roundNumber === totalRounds) {
        return t("final");
      }
      if (roundNumber === totalRounds - 1) {
        return t("semiFinals");
      }
      if (roundNumber === totalRounds - 2) {
        return t("quarterFinals");
      }
    }
    return t("roundN", { round: roundNumber });
  };

  const sortedMatches = [...matches].sort((a, b) => a.id - b.id);

  const total = sortedMatches.length;
  const finished = sortedMatches.filter(
    (m) => m.status === "finished" || m.status === "forfeit",
  ).length;
  const allFinished = total > 0 && finished === total;
  const isCurrent = roundNumber === currentRound;

  // Find matches that are scheduled and have both players ready to play
  const readyToStartMatches = sortedMatches.filter(
    (m) => m.status === "scheduled" && m.playerA && m.playerB,
  );

  return (
    <Card className={isCurrent ? "border-primary/50 shadow-sm" : ""}>
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              {isElimination && roundNumber === totalRounds ? (
                <Trophy className="size-5 text-yellow-500" />
              ) : (
                <Swords className="size-5 text-primary" />
              )}
              <CardTitle className="text-base font-semibold">
                {getRoundTitle()}
              </CardTitle>
            </div>

            {isElimination && totalRounds > 0 && (
              <Badge variant="outline" className="text-xs">
                Ronde {roundNumber}/{totalRounds}
              </Badge>
            )}

            {isCurrent && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                {t("currentRound")}
              </Badge>
            )}

            {allFinished ? (
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-600 border-green-500/20"
              >
                {t("roundStatusCompleted")}
              </Badge>
            ) : isCurrent ? (
              <Badge
                variant="outline"
                className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
              >
                {t("roundStatusInProgress")}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                {t("roundStatusPending")}
              </Badge>
            )}

            <span className="text-xs text-muted-foreground">
              {t("roundMatchesCompleted", { completed: finished, total })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {readyToStartMatches.length > 0 &&
              tournamentStatus === "in_progress" &&
              onBulkStart && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBulkStarting}
                  onClick={() =>
                    onBulkStart(readyToStartMatches.map((m) => m.id))
                  }
                  className="h-8 text-xs font-medium"
                >
                  <PlayCircle className="size-3.5 mr-1 text-primary" />
                  {t("startAllMatches")} ({readyToStartMatches.length})
                </Button>
              )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                <TableHead className="w-16">Match</TableHead>
                <TableHead>{t("playerA")}</TableHead>
                <TableHead className="w-24 text-center">{t("score")}</TableHead>
                <TableHead>{t("playerB")}</TableHead>
                <TableHead className="w-32">{t("status")}</TableHead>
                <TableHead className="w-36 text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMatches.map((match) => {
                const matchStatus =
                  statusConfig[match.status] ?? statusConfig.scheduled;
                const playerAName = getPlayerDisplayName(match.playerA);
                const playerBName = getPlayerDisplayName(match.playerB);
                const isTbdA = !playerAName;
                const isTbdB = !playerBName;
                const isWinnerA =
                  match.winner?.id && match.winner.id === match.playerA?.id;
                const isWinnerB =
                  match.winner?.id && match.winner.id === match.playerB?.id;
                const canStart =
                  match.status === "scheduled" &&
                  !isTbdA &&
                  !isTbdB &&
                  tournamentStatus === "in_progress";
                const canEditScore =
                  tournamentStatus === "in_progress" ||
                  tournamentStatus === "finished";

                return (
                  <TableRow
                    key={match.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      match.status === "in_progress"
                        ? "bg-primary/[0.02]"
                        : match.status === "finished"
                          ? "bg-muted/[0.08]"
                          : ""
                    }`}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground font-medium">
                      #{match.id}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isTbdA ? (
                          <span className="text-xs text-muted-foreground italic bg-muted/60 px-2 py-0.5 rounded border border-dashed border-muted-foreground/30">
                            {t("waitingPreviousRound")}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`truncate text-sm ${
                                isWinnerA ? "font-bold text-green-600" : ""
                              }`}
                            >
                              {playerAName}
                            </span>
                            {isWinnerA && (
                              <Crown className="size-3.5 text-yellow-500 shrink-0" />
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5 font-mono text-sm">
                        {match.status === "finished" ||
                        match.status === "forfeit" ||
                        match.status === "in_progress" ? (
                          <>
                            <span
                              className={`font-semibold ${
                                (match.playerAScore ?? 0) >
                                (match.playerBScore ?? 0)
                                  ? "text-green-600 font-bold"
                                  : ""
                              }`}
                            >
                              {match.playerAScore ?? 0}
                            </span>
                            <span className="text-muted-foreground">-</span>
                            <span
                              className={`font-semibold ${
                                (match.playerBScore ?? 0) >
                                (match.playerAScore ?? 0)
                                  ? "text-green-600 font-bold"
                                  : ""
                              }`}
                            >
                              {match.playerBScore ?? 0}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">vs</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isTbdB ? (
                          <span className="text-xs text-muted-foreground italic bg-muted/60 px-2 py-0.5 rounded border border-dashed border-muted-foreground/30">
                            {t("waitingPreviousRound")}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`truncate text-sm ${
                                isWinnerB ? "font-bold text-green-600" : ""
                              }`}
                            >
                              {playerBName}
                            </span>
                            {isWinnerB && (
                              <Crown className="size-3.5 text-yellow-500 shrink-0" />
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {matchStatus && (
                        <Badge
                          variant="outline"
                          className={`gap-1 text-xs py-0.5 ${matchStatus.color}`}
                        >
                          {matchStatus.icon}
                          {t(matchStatus.labelKey)}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canStart && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-xs text-primary hover:text-primary"
                            onClick={() => onStartMatch(match)}
                          >
                            <PlayCircle className="size-3.5 mr-1" />
                            {t("start")}
                          </Button>
                        )}

                        {canEditScore && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-xs"
                            onClick={() => onEditScore(match)}
                          >
                            <Edit className="size-3.5 mr-1" />
                            {t("score")}
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          asChild
                          title={t("viewDetails")}
                        >
                          <Link
                            href={`/tournaments/${tournamentId}/matches/${match.id}`}
                          >
                            <ExternalLink className="size-3.5 text-muted-foreground" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {allFinished && isCurrent && roundNumber < totalRounds && (
          <div className="p-3 bg-green-500/10 border-t border-green-500/20 text-center text-xs font-medium text-green-700 dark:text-green-300">
            {t("readyForNextRound")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
