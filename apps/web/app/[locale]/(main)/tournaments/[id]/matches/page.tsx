"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Play,
  RotateCcw,
  Search,
  Trophy,
  X,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import { H1 } from "@/components/Shared/Titles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/contexts/AuthContext";
import { useMatches } from "@/hooks/useMatches";
import { usePermissions } from "@/hooks/usePermissions";
import { useTournament } from "@/hooks/useTournament";
import { ResetMatchDialog } from "./_components/ResetMatchDialog";
import { useLocale, useTranslations } from "next-intl";

export default function MatchesPage() {
  const t = useTranslations("TournamentMatches");
  const locale = useLocale();
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { tournament } = useTournament(id as string);
  const {
    matches,
    stats,
    isLoading,
    error,
    startMatch,
    startMatches,
    resetMatch,
    isStarting,
    isResetting,
  } = useMatches(id as string);
  const permissions = usePermissions(user, tournament);
  const [matchToReset, setMatchToReset] = useState<number | null>(null);
  const [bulkStartOpen, setBulkStartOpen] = useState(false);

  const [filters, setFilters] = useState({
    round: "all",
    status: "all",
    search: "",
  });

  const filteredMatches = matches.filter((match) => {
    if (filters.round !== "all" && match.round.toString() !== filters.round)
      return false;
    if (filters.status !== "all" && match.status !== filters.status)
      return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const playerAName = match.playerA?.name?.toLowerCase() || "";
      const playerBName = match.playerB?.name?.toLowerCase() || "";
      if (
        !playerAName.includes(searchLower) &&
        !playerBName.includes(searchLower)
      )
        return false;
    }
    return true;
  });
  const startableMatches = matches.filter(
    (match) =>
      tournament?.status === "in_progress" &&
      match.status === "scheduled" &&
      match.round === tournament.currentRound &&
      Boolean(match.playerA && match.playerB),
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Clock className="w-4 h-4 text-gray-500" />;
      case "in_progress":
        return <Play className="w-4 h-4 text-blue-500" />;
      case "finished":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "forfeit":
        return <X className="w-4 h-4 text-red-500" />;
      case "cancelled":
        return <X className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline">{t("scheduled")}</Badge>;
      case "in_progress":
        return <Badge variant="secondary">{t("inProgress")}</Badge>;
      case "finished":
        return <Badge variant="default">{t("finished")}</Badge>;
      case "forfeit":
        return <Badge variant="destructive">{t("forfeit")}</Badge>;
      case "cancelled":
        return <Badge variant="secondary">{t("cancelled")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case "final":
        return t("phaseFinal");
      case "semi_final":
        return t("phaseSemiFinal");
      case "quarter_final":
        return t("phaseQuarterFinal");
      default:
        return t("phaseQualification");
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const rounds = tournament?.totalRounds
    ? Array.from({ length: tournament.totalRounds }, (_, i) => i + 1)
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-background px-4 py-16">
        <div className="mx-auto max-w-xl text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h1 className="text-2xl font-bold">{t("unavailable")}</h1>
          <p className="mt-2 text-muted-foreground">{t("loadError")}</p>
          <Button className="mt-5" asChild>
            <Link href={`/tournaments/${id}`}>{t("backToTournament")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/tournaments/${id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("backToTournament")}
            </Link>
          </Button>

          <div className="flex-1">
            <H1 className="mb-2">Matchs — {tournament.name}</H1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{matches.length} matchs au total</span>
              <span>{stats.finished} terminés</span>
              <span>{stats.inProgress} en cours</span>
              <span>{stats.scheduled} programmés</span>
            </div>
          </div>

          <Button variant="outline" asChild>
            <Link href={`/tournaments/${id}/bracket`}>
              <Trophy className="w-4 h-4 mr-2" />
              {t("viewBracket")}
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.total}
              </div>
              <div className="text-sm text-muted-foreground">{t("total")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.finished}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("finishedPlural")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.inProgress}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("inProgress")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">
                {stats.scheduled}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("scheduledPlural")}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">{t("search")}</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder={t("playerPlaceholder")}
                    className="pl-8"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="round">{t("round")}</Label>
                <Select
                  value={filters.round}
                  onValueChange={(value) =>
                    setFilters({ ...filters, round: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("allRounds")} />
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

              <div className="space-y-2">
                <Label htmlFor="status">{t("status")}</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters({ ...filters, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("allStatuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allStatuses")}</SelectItem>
                    <SelectItem value="scheduled">{t("scheduled")}</SelectItem>
                    <SelectItem value="in_progress">
                      {t("inProgress")}
                    </SelectItem>
                    <SelectItem value="finished">{t("finished")}</SelectItem>
                    <SelectItem value="forfeit">{t("forfeit")}</SelectItem>
                    <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilters({
                      round: "all",
                      status: "all",
                      search: "",
                    })
                  }
                  className="w-full"
                >
                  {t("reset")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("match")}</TableHead>
                  <TableHead>{t("round")}</TableHead>
                  <TableHead>{t("phase")}</TableHead>
                  <TableHead>{t("players")}</TableHead>
                  <TableHead>{t("score")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("time")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatches.length > 0 ? (
                  filteredMatches.map((match) => (
                    <TableRow
                      key={match.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() =>
                        router.push(`/tournaments/${id}/matches/${match.id}`)
                      }
                    >
                      <TableCell className="font-medium">#{match.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Ronde {match.round}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {getPhaseLabel(match.phase)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {match.playerA?.name[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {match.playerA?.name || t("toBeDetermined")}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            vs
                          </span>
                          <div className="flex items-center gap-1">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {match.playerB?.name[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {match.playerB?.name || t("toBeDetermined")}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {match.status === "finished" ||
                        match.status === "forfeit" ? (
                          <span className="font-medium">
                            {match.playerAScore} - {match.playerBScore}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(match.status)}
                          {getStatusBadge(match.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(match.scheduledDate ?? undefined)}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/tournaments/${id}/matches/${match.id}`}
                              aria-label={`Voir le match ${match.id}`}
                              title="Voir le match"
                            >
                              <Eye className="w-3 h-3" />
                            </Link>
                          </Button>

                          {permissions.canStartMatches &&
                            tournament?.status === "in_progress" &&
                            match.status === "scheduled" &&
                            match.round === tournament.currentRound &&
                            match.playerA &&
                            match.playerB && (
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label={`Démarrer le match ${match.id}`}
                                title="Démarrer le match"
                                onClick={() => startMatch(match.id)}
                                disabled={isStarting}
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                            )}

                          {permissions.canResetMatches &&
                            tournament?.status === "in_progress" &&
                            match.round === tournament.currentRound &&
                            (match.status === "finished" ||
                              match.status === "forfeit") && (
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label={`Réinitialiser le match ${match.id}`}
                                title="Réinitialiser le match"
                                onClick={() => setMatchToReset(match.id)}
                              >
                                <RotateCcw className="w-3 h-3" />
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>
                          {matches.length === 0
                            ? t("emptyBeforeStart")
                            : t("emptyFiltered")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {permissions.canStartMatches &&
          tournament?.status === "in_progress" && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{t("quickActions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setBulkStartOpen(true)}
                    disabled={startableMatches.length === 0 || isStarting}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isStarting
                      ? t("starting")
                      : `Démarrer les matchs de la ronde (${startableMatches.length})`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
      </div>
      <ResetMatchDialog
        open={matchToReset !== null}
        isPending={isResetting}
        onOpenChange={(open) => {
          if (!open) setMatchToReset(null);
        }}
        onConfirm={(reason) => {
          if (matchToReset === null) return;
          resetMatch(matchToReset, { reason });
          setMatchToReset(null);
        }}
      />
      <AlertDialog open={bulkStartOpen} onOpenChange={setBulkStartOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("startAllConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              Les {startableMatches.length} matchs programmés de la ronde
              courante passeront simultanément au statut « en cours ». Les
              joueurs concernés seront immédiatement autorisés à rejoindre leur
              table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isStarting}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={startableMatches.length === 0 || isStarting}
              onClick={() => {
                startMatches(startableMatches.map((match) => match.id));
                setBulkStartOpen(false);
              }}
            >
              {isStarting ? t("starting") : t("startMatches")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
