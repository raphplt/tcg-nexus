"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Lock,
  PauseCircle,
  Play,
  ShieldAlert,
  Target,
  TrendingUp,
  Trophy,
  User,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { H1 } from "@/components/Shared/Titles";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useRankings } from "@/hooks/useRankings";
import { useTournament } from "@/hooks/useTournament";
import { matchService } from "@/services/match.service";
import { tournamentService } from "@/services/tournament.service";
import { Match, PlayerTournamentDashboard } from "@/types/tournament";
import { useLocale, useTranslations } from "next-intl";

export default function PlayerDashboardPage() {
  const t = useTranslations("TournamentPlayer");
  const locale = useLocale();
  const { id } = useParams();
  const tournamentId = parseInt(id as string, 10);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tournament } = useTournament(id as string);
  const { getPlayerRanking } = useRankings(id as string);

  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [proposeMyScore, setProposeMyScore] = useState(2);
  const [proposeOppScore, setProposeOppScore] = useState(0);
  const [dropModalOpen, setDropModalOpen] = useState(false);
  const [dropReason, setDropReason] = useState("");

  const { data: dashboard, refetch: refetchDashboard } =
    useQuery<PlayerTournamentDashboard>({
      queryKey: ["tournament", tournamentId, "player-dashboard"],
      queryFn: () => tournamentService.getPlayerDashboard(tournamentId),
      enabled: !!user?.player?.id && !isNaN(tournamentId),
      refetchInterval: 10000,
    });

  const { data: playerMatches = [] } = useQuery<Match[]>({
    queryKey: ["player", user?.player?.id, "tournament", id, "matches"],
    queryFn: () =>
      matchService.getPlayerMatches(user!.player!.id, tournamentId),
    enabled: !!user?.player?.id && !isNaN(tournamentId),
  });

  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (dashboard?.remainingSeconds !== undefined && dashboard.remainingSeconds !== null) {
      setCountdown(dashboard.remainingSeconds);
    }
  }, [dashboard?.remainingSeconds]);

  useEffect(() => {
    if (countdown === null || countdown <= 0 || dashboard?.isRoundPaused) {
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, dashboard?.isRoundPaused]);

  // Mutations
  const proposeMutation = useMutation({
    mutationFn: (data: { playerAScore: number; playerBScore: number }) => {
      if (!dashboard?.activeMatch) throw new Error("No active match");
      return tournamentService.proposeMatchResult(
        dashboard.activeMatch.matchId,
        data,
      );
    },
    onSuccess: () => {
      toast.success("Proposition de score envoyée à votre adversaire.");
      setProposeModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      refetchDashboard();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erreur lors de l'envoi du score.");
    },
  });

  const respondMutation = useMutation({
    mutationFn: (data: { accept: boolean; disputeReason?: string }) => {
      if (!dashboard?.activeMatch) throw new Error("No active match");
      return tournamentService.respondMatchResult(
        dashboard.activeMatch.matchId,
        data,
      );
    },
    onSuccess: (res) => {
      if (res.proposal?.status === "confirmed") {
        toast.success("Score confirmé avec succès !");
      } else {
        toast("Litige signalé aux organisateurs.", { icon: "⚠️" });
      }
      setDisputeModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      refetchDashboard();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erreur lors de la validation.");
    },
  });

  const dropMutation = useMutation({
    mutationFn: (data: { reason?: string }) => {
      return tournamentService.dropPlayer(tournamentId, data);
    },
    onSuccess: () => {
      toast("Votre abandon a été enregistré.", { icon: "ℹ️" });
      setDropModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      refetchDashboard();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Impossible d'abandonner le tournoi.");
    },
  });

  const playerRanking = user?.player ? getPlayerRanking(user.player.id) : null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Clock className="w-4 h-4 text-gray-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case "finished":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "forfeit":
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMatchResult = (match: Match) => {
    if (!user?.player) return null;

    if (match.status !== "finished" && match.status !== "forfeit") {
      return <Badge variant="outline">{t("toPlay")}</Badge>;
    }

    const isPlayerA = match.playerA?.id === user.player.id;
    const playerScore = isPlayerA ? match.playerAScore : match.playerBScore;
    const opponentScore = isPlayerA ? match.playerBScore : match.playerAScore;

    if (match.winner?.id === user.player.id) {
      return (
        <Badge variant="default">
          Victoire ({playerScore}-{opponentScore})
        </Badge>
      );
    } else if (match.winner) {
      return (
        <Badge variant="destructive">
          Défaite ({playerScore}-{opponentScore})
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          Égalité ({playerScore}-{opponentScore})
        </Badge>
      );
    }
  };

  const getOpponent = (match: Match) => {
    if (!user?.player) return null;
    return match.playerA?.id === user.player.id ? match.playerB : match.playerA;
  };

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const completedMatches = playerMatches.filter(
    (m) => m.status === "finished" || m.status === "forfeit",
  );
  const wins = completedMatches.filter(
    (m) => m.winner?.id === user?.player?.id,
  ).length;
  const losses = completedMatches.filter(
    (m) => m.winner && m.winner.id !== user?.player?.id,
  ).length;
  const draws = completedMatches.filter((m) => !m.winner).length;

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!user?.player) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-4xl mx-auto text-center">
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {t("playerProfileRequiredTitle")}
          </h1>
          <p className="text-muted-foreground mb-4">
            {t("playerProfileRequired")}
          </p>
          <Button asChild>
            <Link href={`/tournaments/${id}`}>{t("backToTournament")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const activeMatch = dashboard?.activeMatch;
  const isOpponentProposal =
    activeMatch?.pendingProposal && !activeMatch.pendingProposal.proposedByMe;
  const isMyPendingProposal =
    activeMatch?.pendingProposal && activeMatch.pendingProposal.proposedByMe;
  const isDisputed = activeMatch?.resultStatus === "disputed";

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/tournaments/${id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToTournament")}
              </Link>
            </Button>
            <div>
              <H1 className="mb-1">{tournament?.name || "Tournoi"}</H1>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>

          {!dashboard?.isDropped && (
            <Dialog open={dropModalOpen} onOpenChange={setDropModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  {t("dropTournament")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("dropConfirmTitle")}</DialogTitle>
                  <DialogDescription>{t("dropConfirmDesc")}</DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <Label htmlFor="drop-reason" className="mb-2 block text-sm">
                    {t("dropReasonPlaceholder")}
                  </Label>
                  <Input
                    id="drop-reason"
                    value={dropReason}
                    onChange={(e) => setDropReason(e.target.value)}
                    placeholder={t("dropReasonPlaceholder")}
                  />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setDropModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => dropMutation.mutate({ reason: dropReason })}
                    disabled={dropMutation.isPending}
                  >
                    {t("confirm")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Live Cockpit Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Round Clock Card */}
          <Card className="border-primary/20 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  {t("roundClock")} — Ronde {dashboard?.currentRound ?? 1}
                </span>
                {dashboard?.isRoundPaused ? (
                  <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
                    <PauseCircle className="w-3 h-3" />
                    {t("paused")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    {dashboard?.tournamentStatus ?? "Actif"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold tracking-tight">
                {countdown !== null ? formatCountdown(countdown) : "--:--"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {dashboard?.isRoundPaused
                  ? "Chronomètre arrêté administrativement"
                  : t("remaining")}
              </p>
            </CardContent>
          </Card>

          {/* Deck Snapshot Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  {t("deckSnapshot")}
                </span>
                {dashboard?.deckStatus.isLocked ? (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Lock className="w-3 h-3" />
                    {t("deckLocked")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-green-600">
                    {t("deckUnlocked")}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-semibold text-lg truncate">
                {dashboard?.deckStatus.deckName || "Aucun deck soumis"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {dashboard?.deckStatus.isSubmitted ? (
                  dashboard.deckStatus.isValid ? (
                    <span className="text-green-600 font-medium">
                      ✓ Deck valide (60 {t("deckCardsCount")})
                    </span>
                  ) : (
                    <span className="text-destructive font-medium">
                      ⚠ Deck incomplet ou non valide
                    </span>
                  )
                ) : (
                  "Soumission requise avant le début"
                )}
              </p>
            </CardContent>
          </Card>

          {/* Current Rank & Record */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  {t("myStats")}
                </span>
                {playerRanking && (
                  <Badge variant="default">Rang #{playerRanking.rank}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {wins}V - {losses}D - {draws}N
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {playerRanking ? `${playerRanking.points} points de match` : "0 point"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Match & Score Reporting Cockpit */}
        {activeMatch && (
          <Card className="border-2 border-primary/30 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {t("activeMatch")} — Ronde {activeMatch.round}
                </span>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {t("tableNumber")} #{activeMatch.tableNumber || 1}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/40 rounded-lg">
                <div>
                  <span className="text-xs uppercase font-semibold text-muted-foreground">
                    {t("opponent")}
                  </span>
                  <div className="text-xl font-bold">{activeMatch.opponentName}</div>
                </div>

                <div className="text-center sm:text-right">
                  <span className="text-xs uppercase font-semibold text-muted-foreground">
                    Statut du match
                  </span>
                  <div>
                    <Badge variant={isDisputed ? "destructive" : "secondary"}>
                      {isDisputed
                        ? "Litige en cours"
                        : activeMatch.resultStatus === "confirmed"
                          ? "Score validé"
                          : activeMatch.resultStatus === "proposed"
                            ? "Score en attente"
                            : "En cours"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Proposal Pending Opponent Response */}
              {isOpponentProposal && (
                <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-900 dark:text-amber-300">
                    {t("opponentProposed")}
                  </AlertTitle>
                  <AlertDescription className="text-amber-800 dark:text-amber-200 mt-2">
                    <p className="mb-3">
                      Votre adversaire propose le résultat :{" "}
                      <strong>
                        {activeMatch.pendingProposal!.playerAScore} -{" "}
                        {activeMatch.pendingProposal!.playerBScore}
                      </strong>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => respondMutation.mutate({ accept: true })}
                        disabled={respondMutation.isPending}
                      >
                        {t("acceptScore")}
                      </Button>

                      <Dialog open={disputeModalOpen} onOpenChange={setDisputeModalOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            {t("disputeScore")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("disputeScore")}</DialogTitle>
                            <DialogDescription>
                              Indiquez aux juges pourquoi vous contestez ce score.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-2">
                            <Input
                              value={disputeReason}
                              onChange={(e) => setDisputeReason(e.target.value)}
                              placeholder={t("disputeReasonPlaceholder")}
                            />
                          </div>
                          <DialogFooter>
                            <Button
                              variant="ghost"
                              onClick={() => setDisputeModalOpen(false)}
                            >
                              Annuler
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() =>
                                respondMutation.mutate({
                                  accept: false,
                                  disputeReason,
                                })
                              }
                              disabled={respondMutation.isPending}
                            >
                              {t("confirm")}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* My Pending Proposal */}
              {isMyPendingProposal && (
                <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900 dark:text-blue-300">
                    Proposition transmise
                  </AlertTitle>
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    {t("awaitingOpponent")} (Score :{" "}
                    <strong>
                      {activeMatch.pendingProposal!.playerAScore} -{" "}
                      {activeMatch.pendingProposal!.playerBScore}
                    </strong>
                    ).
                  </AlertDescription>
                </Alert>
              )}

              {/* Score Submission Form */}
              {!activeMatch.pendingProposal &&
                activeMatch.status !== "finished" &&
                activeMatch.status !== "forfeit" && (
                  <div className="pt-2">
                    <Dialog open={proposeModalOpen} onOpenChange={setProposeModalOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
                          {t("proposeScore")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("proposeScore")}</DialogTitle>
                          <DialogDescription>
                            Entrez les manches remportées contre {activeMatch.opponentName}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                          <div>
                            <Label htmlFor="my-score">Mon score</Label>
                            <Input
                              id="my-score"
                              type="number"
                              min={0}
                              max={2}
                              value={proposeMyScore}
                              onChange={(e) =>
                                setProposeMyScore(parseInt(e.target.value, 10) || 0)
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="opp-score">Score adversaire</Label>
                            <Input
                              id="opp-score"
                              type="number"
                              min={0}
                              max={2}
                              value={proposeOppScore}
                              onChange={(e) =>
                                setProposeOppScore(parseInt(e.target.value, 10) || 0)
                              }
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="ghost"
                            onClick={() => setProposeModalOpen(false)}
                          >
                            Annuler
                          </Button>
                          <Button
                            onClick={() =>
                              proposeMutation.mutate({
                                playerAScore: proposeMyScore,
                                playerBScore: proposeOppScore,
                              })
                            }
                            disabled={proposeMutation.isPending}
                          >
                            Soumettre le score
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Match History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              {t("myMatches")}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("round")}</TableHead>
                  <TableHead>{t("opponent")}</TableHead>
                  <TableHead>{t("result")}</TableHead>
                  <TableHead>{t("score")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerMatches.length > 0 ? (
                  [...playerMatches]
                    .sort((a, b) => a.round - b.round)
                    .map((match) => {
                      const opponent = getOpponent(match);
                      const result = getMatchResult(match);

                      return (
                        <TableRow key={match.id}>
                          <TableCell>
                            <Badge variant="outline">Ronde {match.round}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs">
                                  {opponent?.name?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span>{opponent?.name || t("toBeDetermined")}</span>
                            </div>
                          </TableCell>
                          <TableCell>{result}</TableCell>
                          <TableCell>
                            {match.status === "finished" ||
                            match.status === "forfeit" ? (
                              <span className="font-medium">
                                {user?.player?.id === match.playerA?.id
                                  ? `${match.playerAScore}-${match.playerBScore}`
                                  : `${match.playerBScore}-${match.playerAScore}`}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {formatDate(
                                (match.finishedAt ??
                                  match.startedAt ??
                                  match.scheduledDate) ||
                                  undefined,
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/tournaments/${id}/matches/${match.id}`}>
                                Voir
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>{t("noMatches")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="h-auto p-4" asChild>
            <Link href={`/tournaments/${id}/bracket`}>
              <div className="text-center">
                <Trophy className="w-6 h-6 mx-auto mb-2" />
                <div className="font-medium">{t("bracket")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("viewProgress")}
                </div>
              </div>
            </Link>
          </Button>

          <Button variant="outline" className="h-auto p-4" asChild>
            <Link href={`/tournaments/${id}/rankings`}>
              <div className="text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                <div className="font-medium">{t("rankings")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("viewPosition")}
                </div>
              </div>
            </Link>
          </Button>

          <Button variant="outline" className="h-auto p-4" asChild>
            <Link href={`/tournaments/${id}/matches`}>
              <div className="text-center">
                <Clock className="w-6 h-6 mx-auto mb-2" />
                <div className="font-medium">{t("allMatches")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("viewSchedule")}
                </div>
              </div>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
