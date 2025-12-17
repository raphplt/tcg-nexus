"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Swords,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Filter,
  LayoutGrid,
  List,
} from "lucide-react";
import { TournamentBracket } from "../TournamentBracket";
import { useAuth } from "@/contexts/AuthContext";
import { tournamentService } from "@/services/tournament.service";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getPlayerName, TabMatchesProps } from "@/app/tournaments/utils";

const statusConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  scheduled: {
    label: "Planifié",
    icon: <Clock className="size-3" />,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  in_progress: {
    label: "En cours",
    icon: <PlayCircle className="size-3" />,
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  finished: {
    label: "Terminé",
    icon: <CheckCircle2 className="size-3" />,
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  forfeit: {
    label: "Forfait",
    icon: <XCircle className="size-3" />,
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  },
  cancelled: {
    label: "Annulé",
    icon: <XCircle className="size-3" />,
    color: "bg-red-500/10 text-red-500 border-red-500/20",
  },
};

export function TabMatches({
  matches,
  tournamentId,
}: TabMatchesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"bracket" | "list">("bracket");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roundFilter, setRoundFilter] = useState<string>("all");

  const isAdmin = user?.role === "admin" || user?.role === "moderator";

  const rounds = useMemo(() => {
    const uniqueRounds = [...new Set(matches.map((m) => m.round))];
    return uniqueRounds.sort((a, b) => a - b);
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      if (statusFilter !== "all" && match.status !== statusFilter) return false;
      if (roundFilter !== "all" && match.round !== parseInt(roundFilter))
        return false;
      return true;
    });
  }, [matches, statusFilter, roundFilter]);

  const stats = useMemo(() => {
    return {
      total: matches.length,
      finished: matches.filter((m) => m.status === "finished").length,
      inProgress: matches.filter((m) => m.status === "in_progress").length,
      scheduled: matches.filter((m) => m.status === "scheduled").length,
    };
  }, [matches]);

  const handleUpdateScore = async (
    matchId: number,
    scoreA: number,
    scoreB: number,
  ) => {
    if (!tournamentId) return;

    try {
      await tournamentService.updateMatch(tournamentId, matchId, {
        playerAScore: scoreA,
        playerBScore: scoreB,
        status: scoreA !== scoreB ? "finished" : "in_progress",
      });
      queryClient.invalidateQueries({ queryKey: ["tournament"] });
      toast.success("Score enregistré !");
    } catch (error) {
      console.error("Failed to update match:", error);
      toast.error("Erreur lors de l'enregistrement du score");
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          icon={<Swords className="size-5" />}
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <StatCard
          label="Terminés"
          value={stats.finished}
          icon={<CheckCircle2 className="size-5" />}
          color="text-green-500"
          bgColor="bg-green-500/10"
        />
        <StatCard
          label="En cours"
          value={stats.inProgress}
          icon={<PlayCircle className="size-5" />}
          color="text-yellow-500"
          bgColor="bg-yellow-500/10"
        />
        <StatCard
          label="Planifiés"
          value={stats.scheduled}
          icon={<Clock className="size-5" />}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Swords className="size-5 text-primary" />
          {viewMode === "bracket" ? "Arbre du tournoi" : "Liste des matches"}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "bracket" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("bracket")}
          >
            <LayoutGrid className="size-4 mr-1" />
            Bracket
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="size-4 mr-1" />
            Liste
          </Button>
        </div>
      </div>

      {viewMode === "bracket" && (
        <TournamentBracket
          matches={matches}
          isAdmin={isAdmin}
          onUpdateScore={handleUpdateScore}
        />
      )}

      {viewMode === "list" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                Liste des matches
              </CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="scheduled">Planifié</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="finished">Terminé</SelectItem>
                    <SelectItem value="forfeit">Forfait</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={roundFilter}
                  onValueChange={setRoundFilter}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Round" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rounds</SelectItem>
                    {rounds.map((round) => (
                      <SelectItem
                        key={round}
                        value={round.toString()}
                      >
                        Round {round}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-16">Match</TableHead>
                    <TableHead>Joueur A</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead>Joueur B</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMatches.length > 0 ? (
                    filteredMatches.map((match) => {
                      const matchStatus =
                        statusConfig[match.status] ?? statusConfig.scheduled;
                      const playerAWins =
                        match.status === "finished" &&
                        (match.playerAScore ?? 0) > (match.playerBScore ?? 0);
                      const playerBWins =
                        match.status === "finished" &&
                        (match.playerBScore ?? 0) > (match.playerAScore ?? 0);

                      return (
                        <TableRow
                          key={match.id}
                          className="hover:bg-muted/30"
                        >
                          <TableCell className="font-medium">
                            #{match.id}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                playerAWins
                                  ? "font-semibold text-green-600"
                                  : ""
                              }
                            >
                              {getPlayerName(match.playerA)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2 font-mono">
                              <span
                                className={`font-bold ${
                                  playerAWins ? "text-green-500" : ""
                                }`}
                              >
                                {match.playerAScore ?? 0}
                              </span>
                              <span className="text-muted-foreground">-</span>
                              <span
                                className={`font-bold ${
                                  playerBWins ? "text-green-500" : ""
                                }`}
                              >
                                {match.playerBScore ?? 0}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                playerBWins
                                  ? "font-semibold text-green-600"
                                  : ""
                              }
                            >
                              {getPlayerName(match.playerB)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">Round {match.round}</Badge>
                          </TableCell>
                          <TableCell>
                            {matchStatus && (
                              <Badge
                                variant="outline"
                                className={`gap-1 ${matchStatus.color}`}
                              >
                                {matchStatus.icon}
                                {matchStatus.label}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-muted-foreground"
                      >
                        {matches.length === 0
                          ? "Aucun match planifié pour le moment."
                          : "Aucun match ne correspond aux filtres sélectionnés."}
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
  );
}

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
