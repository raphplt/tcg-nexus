"use client";

import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit,
  Filter,
  Layers,
  LayoutGrid,
  List,
  PlayCircle,
  RefreshCw,
  Swords,
  Trophy,
  XCircle,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBracket } from "@/hooks/useBracket";
import { tournamentService } from "@/services/tournament.service";
import { Match, Tournament } from "@/types/tournament";
import { DoubleEliminationBracket } from "../../bracket/_components/DoubleEliminationBracket";
import { EliminationBracket } from "../../bracket/_components/EliminationBracket";
import { AdminRoundCard } from "./AdminRoundCard";

interface MatchManagerProps {
  tournamentId: number;
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
 * Formats a player's display name from their record or user details.
 *
 * @param player - Player entity with optional user relation.
 * @returns Formatted name or localized fallback.
 */
function getPlayerName(player: any): string {
  if (!player) return "À déterminer";
  if (player.user) {
    const fullName = `${player.user.firstName || ""} ${player.user.lastName || ""}`.trim();
    if (fullName) return fullName;
    if (player.user.email) return player.user.email;
  }
  return player.name || `Joueur #${player.id}`;
}

/**
 * Tournament Admin Match Management Component.
 * Provides round-by-round organization, bracket tree visualization,
 * score management, bulk match start, and format-tailored controls.
 */
export function MatchManager({ tournamentId }: MatchManagerProps) {
  const t = useTranslations("MatchManager");
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"rounds" | "bracket" | "table">("rounds");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roundFilter, setRoundFilter] = useState<string>("all");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [matchStatus, setMatchStatus] = useState<string>("finished");

  const { data: tournament, isLoading: isTournamentLoading } = useQuery<Tournament>({
    queryKey: ["tournament", tournamentId],
    queryFn: () => tournamentService.getById(String(tournamentId)),
  });

  const {
    bracket,
    isLoading: isBracketLoading,
    isSingleElimination,
    isDoubleElimination,
  } = useBracket(String(tournamentId));

  const matches = useMemo(
    () => tournament?.matches || [],
    [tournament?.matches],
  );

  const totalRounds = tournament?.totalRounds || bracket?.totalRounds || 1;
  const isElimination = isSingleElimination || isDoubleElimination;

  const updateMatchMutation = useMutation({
    mutationFn: async ({
      matchId,
      data,
    }: {
      matchId: number;
      data: {
        playerAScore?: number;
        playerBScore?: number;
        status: string;
      };
    }) => {
      return tournamentService.updateMatch(tournamentId, matchId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      queryClient.invalidateQueries({
        queryKey: ["tournament", String(tournamentId), "bracket"],
      });
      toast.success(t("updated"));
      setEditDialogOpen(false);
      setSelectedMatch(null);
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const bulkStartMutation = useMutation({
    mutationFn: async (matchIds: number[]) => {
      return tournamentService.startMatchesInBulk(tournamentId, matchIds);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      queryClient.invalidateQueries({
        queryKey: ["tournament", String(tournamentId), "bracket"],
      });
      const count = data.startedCount ?? data.matches?.length ?? 0;
      toast.success(t("bulkStartSuccess", { count }));
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const rounds = useMemo(() => {
    const uniqueRounds = [...new Set(matches.map((m) => m.round))];
    return uniqueRounds.sort((a, b) => a - b);
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      if (statusFilter !== "all" && match.status !== statusFilter) return false;
      if (roundFilter !== "all" && match.round !== parseInt(roundFilter, 10))
        return false;
      return true;
    });
  }, [matches, statusFilter, roundFilter]);

  const sortedChronologicalMatches = useMemo(() => {
    return [...filteredMatches].sort((a, b) => a.round - b.round || a.id - b.id);
  }, [filteredMatches]);

  const stats = useMemo(() => {
    return {
      total: matches.length,
      finished: matches.filter(
        (m) => m.status === "finished" || m.status === "forfeit",
      ).length,
      inProgress: matches.filter((m) => m.status === "in_progress").length,
      scheduled: matches.filter((m) => m.status === "scheduled").length,
    };
  }, [matches]);

  const handleEditMatch = (match: Match) => {
    setSelectedMatch(match);
    setScoreA(match.playerAScore ?? 0);
    setScoreB(match.playerBScore ?? 0);
    setMatchStatus(
      match.status === "scheduled" || match.status === "in_progress"
        ? "finished"
        : match.status,
    );
    setEditDialogOpen(true);
  };

  const handleSaveScore = () => {
    if (!selectedMatch) return;

    if (matchStatus === "finished" && isElimination && scoreA === scoreB) {
      toast.error(t("winnerRequired"));
      return;
    }

    updateMatchMutation.mutate({
      matchId: selectedMatch.id,
      data: {
        playerAScore: scoreA,
        playerBScore: scoreB,
        status: matchStatus,
      },
    });
  };

  const handleStartMatch = (match: Match) => {
    updateMatchMutation.mutate({
      matchId: match.id,
      data: {
        status: "in_progress",
      },
    });
  };

  const handleBulkStart = (matchIds: number[]) => {
    if (matchIds.length === 0) return;
    bulkStartMutation.mutate(matchIds);
  };

  if (isTournamentLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <RefreshCw className="size-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <Swords className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">{t("empty")}</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            {t("generatedOnStart")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          icon={<Swords className="size-5" />}
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <StatCard
          label={t("finishedPlural")}
          value={stats.finished}
          icon={<CheckCircle2 className="size-5" />}
          color="text-green-500"
          bgColor="bg-green-500/10"
        />
        <StatCard
          label={t("statusInProgress")}
          value={stats.inProgress}
          icon={<PlayCircle className="size-5" />}
          color="text-yellow-500"
          bgColor="bg-yellow-500/10"
        />
        <StatCard
          label={t("scheduledPlural")}
          value={stats.scheduled}
          icon={<Clock className="size-5" />}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
      </div>

      {/* Main Container */}
      <div className="space-y-4">
        {/* Controls, View Switcher & Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* View Switcher Buttons */}
              <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg w-fit">
                <Button
                  size="sm"
                  variant={viewMode === "rounds" ? "default" : "ghost"}
                  onClick={() => setViewMode("rounds")}
                  className="h-8 text-xs font-medium"
                >
                  <Layers className="size-3.5 mr-1.5" />
                  {t("viewByRound")}
                </Button>

                {isElimination && (
                  <Button
                    size="sm"
                    variant={viewMode === "bracket" ? "default" : "ghost"}
                    onClick={() => setViewMode("bracket")}
                    className="h-8 text-xs font-medium"
                  >
                    <LayoutGrid className="size-3.5 mr-1.5" />
                    {t("viewBracket")}
                  </Button>
                )}

                <Button
                  size="sm"
                  variant={viewMode === "table" ? "default" : "ghost"}
                  onClick={() => setViewMode("table")}
                  className="h-8 text-xs font-medium"
                >
                  <List className="size-3.5 mr-1.5" />
                  {t("viewTable")}
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[145px] h-8 text-xs">
                    <SelectValue placeholder={t("status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allStatuses")}</SelectItem>
                    <SelectItem value="scheduled">
                      {t("statusScheduled")}
                    </SelectItem>
                    <SelectItem value="in_progress">
                      {t("statusInProgress")}
                    </SelectItem>
                    <SelectItem value="finished">
                      {t("statusFinished")}
                    </SelectItem>
                    <SelectItem value="forfeit">
                      {t("statusForfeit")}
                    </SelectItem>
                    <SelectItem value="cancelled">
                      {t("statusCancelled")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Round Filter */}
                <Select value={roundFilter} onValueChange={setRoundFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder={t("round")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allRounds")}</SelectItem>
                    {rounds.map((round) => (
                      <SelectItem key={round} value={round.toString()}>
                        Ronde {round}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Round Navigation Pills (when in round or table mode) */}
            {viewMode !== "bracket" && rounds.length > 1 && (
              <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">
                  {t("round")} :
                </span>
                <Button
                  size="sm"
                  variant={roundFilter === "all" ? "secondary" : "ghost"}
                  onClick={() => setRoundFilter("all")}
                  className="h-7 text-xs px-2.5 rounded-full"
                >
                  {t("allRounds")} ({matches.length})
                </Button>

                {rounds.map((roundNum) => {
                  const roundMatches = matches.filter((m) => m.round === roundNum);
                  const finishedCount = roundMatches.filter(
                    (m) => m.status === "finished" || m.status === "forfeit",
                  ).length;
                  const isCurrent = roundNum === tournament?.currentRound;

                  return (
                    <Button
                      key={roundNum}
                      size="sm"
                      variant={
                        roundFilter === roundNum.toString()
                          ? "default"
                          : "outline"
                      }
                      onClick={() => setRoundFilter(roundNum.toString())}
                      className={`h-7 text-xs px-2.5 rounded-full gap-1.5 ${
                        isCurrent && roundFilter !== roundNum.toString()
                          ? "border-primary/50 text-primary"
                          : ""
                      }`}
                    >
                      {isCurrent && (
                        <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                      )}
                      <span>Ronde {roundNum}</span>
                      <span className="text-[10px] opacity-75 font-mono">
                        ({finishedCount}/{roundMatches.length})
                      </span>
                    </Button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Mode 1: Rounds View (Default) */}
        {viewMode === "rounds" && (
          <div className="space-y-6">
            {rounds.map((roundNum) => {
              // If filtering by a specific round, skip other rounds
              if (roundFilter !== "all" && roundFilter !== roundNum.toString()) {
                return null;
              }

              const roundMatches = filteredMatches.filter(
                (m) => m.round === roundNum,
              );

              // If status filtering hides all matches in this round, skip unless explicitly filtering this round
              if (roundMatches.length === 0 && roundFilter === "all") {
                return null;
              }

              return (
                <AdminRoundCard
                  key={roundNum}
                  roundNumber={roundNum}
                  totalRounds={totalRounds}
                  tournamentId={tournamentId}
                  tournamentType={tournament?.type as string}
                  tournamentStatus={tournament?.status as string}
                  currentRound={tournament?.currentRound}
                  matches={roundMatches}
                  onStartMatch={handleStartMatch}
                  onEditScore={handleEditMatch}
                  onBulkStart={handleBulkStart}
                  isBulkStarting={bulkStartMutation.isPending}
                />
              );
            })}

            {filteredMatches.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  {t("emptyFiltered")}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* View Mode 2: Interactive Bracket View */}
        {viewMode === "bracket" && isElimination && (
          <Card>
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Trophy className="size-5 text-primary" />
                  {t("viewBracket")}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  Cliquez sur un match pour saisir un score ou lancer la partie
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 overflow-x-auto">
              {isBracketLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : bracket && bracket.rounds.length > 0 ? (
                <div>
                  {isSingleElimination && (
                    <EliminationBracket
                      bracket={bracket}
                      interactive={true}
                      onMatchClick={(matchId) => {
                        const target = matches.find((m) => m.id === matchId);
                        if (target) handleEditMatch(target);
                      }}
                    />
                  )}

                  {isDoubleElimination && (
                    <DoubleEliminationBracket
                      bracket={bracket}
                      interactive={true}
                      onMatchClick={(matchId) => {
                        const target = matches.find((m) => m.id === matchId);
                        if (target) handleEditMatch(target);
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {t("empty")}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* View Mode 3: Complete Chronological Table View */}
        {viewMode === "table" && (
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <List className="size-4 text-primary" />
                {t("viewTable")}
              </CardTitle>
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
                      <TableHead className="w-28">{t("round")}</TableHead>
                      <TableHead className="w-32">{t("status")}</TableHead>
                      <TableHead className="w-36 text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedChronologicalMatches.map((match) => {
                      const matchStatus =
                        statusConfig[match.status] ?? statusConfig.scheduled;
                      const playerAName = getPlayerName(match.playerA);
                      const playerBName = getPlayerName(match.playerB);
                      const isTbdA = !match.playerA;
                      const isTbdB = !match.playerB;
                      const isWinnerA =
                        match.winner?.id && match.winner.id === match.playerA?.id;
                      const isWinnerB =
                        match.winner?.id && match.winner.id === match.playerB?.id;
                      const canStart =
                        match.status === "scheduled" &&
                        !isTbdA &&
                        !isTbdB &&
                        tournament?.status === "in_progress";
                      const canEditScore =
                        tournament?.status === "in_progress" ||
                        tournament?.status === "finished";

                      return (
                        <TableRow
                          key={match.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground font-medium">
                            #{match.id}
                          </TableCell>

                          <TableCell>
                            <span
                              className={`text-sm ${
                                isTbdA
                                  ? "text-muted-foreground italic"
                                  : isWinnerA
                                    ? "font-bold text-green-600"
                                    : ""
                              }`}
                            >
                              {playerAName}
                            </span>
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
                                <span className="text-xs text-muted-foreground">
                                  vs
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <span
                              className={`text-sm ${
                                isTbdB
                                  ? "text-muted-foreground italic"
                                  : isWinnerB
                                    ? "font-bold text-green-600"
                                    : ""
                              }`}
                            >
                              {playerBName}
                            </span>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              Ronde {match.round}
                            </Badge>
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
                                  onClick={() => handleStartMatch(match)}
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
                                  onClick={() => handleEditMatch(match)}
                                >
                                  <Edit className="size-3.5 mr-1" />
                                  {t("score")}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {sortedChronologicalMatches.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-32 text-center text-muted-foreground text-sm"
                        >
                          {t("emptyFiltered")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Score & Match Status Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editScore")}</DialogTitle>
            <DialogDescription>
              Match #{selectedMatch?.id} — ronde {selectedMatch?.round}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-4 items-center py-2">
              <div className="text-center space-y-2">
                <Label className="text-xs text-muted-foreground font-medium">
                  {t("playerA")}
                </Label>
                <p className="font-semibold text-sm truncate">
                  {getPlayerName(selectedMatch?.playerA)}
                </p>
                <Input
                  type="number"
                  min={0}
                  value={scoreA}
                  onChange={(e) => setScoreA(parseInt(e.target.value, 10) || 0)}
                  className="text-center text-2xl font-bold font-mono h-12"
                />
              </div>

              <div className="text-center text-2xl font-bold text-muted-foreground">
                VS
              </div>

              <div className="text-center space-y-2">
                <Label className="text-xs text-muted-foreground font-medium">
                  {t("playerB")}
                </Label>
                <p className="font-semibold text-sm truncate">
                  {getPlayerName(selectedMatch?.playerB)}
                </p>
                <Input
                  type="number"
                  min={0}
                  value={scoreB}
                  onChange={(e) => setScoreB(parseInt(e.target.value, 10) || 0)}
                  className="text-center text-2xl font-bold font-mono h-12"
                />
              </div>
            </div>

            {/* Match Status Select */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">
                {t("status")}
              </Label>
              <Select value={matchStatus} onValueChange={setMatchStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finished">{t("statusFinished")}</SelectItem>
                  <SelectItem value="in_progress">{t("statusInProgress")}</SelectItem>
                  <SelectItem value="forfeit">{t("statusForfeit")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Validation Notice */}
            {isElimination && matchStatus === "finished" && scoreA === scoreB && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs">
                <AlertCircle className="size-4 shrink-0" />
                <span>{t("noTieAllowed")}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveScore}
              disabled={updateMatchMutation.isPending}
            >
              {updateMatchMutation.isPending ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Metric display card helper component.
 */
function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bgColor}`}>
            <span className={color}>{icon}</span>
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
