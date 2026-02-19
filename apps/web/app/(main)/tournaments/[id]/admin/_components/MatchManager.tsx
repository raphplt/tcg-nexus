"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Swords,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Filter,
  Edit,
  Trophy,
  RefreshCw,
} from "lucide-react";
import { tournamentService } from "@/services/tournament.service";
import { Match, Tournament } from "@/types/tournament";
import toast from "react-hot-toast";

interface MatchManagerProps {
  tournamentId: number;
}

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

export function MatchManager({ tournamentId }: MatchManagerProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roundFilter, setRoundFilter] = useState<string>("all");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);

  const { data: tournament, isLoading } = useQuery<Tournament>({
    queryKey: ["tournament", tournamentId],
    queryFn: () => tournamentService.getById(String(tournamentId)),
  });

  const matches = useMemo(
    () => tournament?.matches || [],
    [tournament?.matches],
  );

  const updateMatchMutation = useMutation({
    mutationFn: async ({
      matchId,
      data,
    }: {
      matchId: number;
      data: { playerAScore: number; playerBScore: number; status: string };
    }) => {
      return tournamentService.updateMatch(tournamentId, matchId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      toast.success("Match mis à jour");
      setEditDialogOpen(false);
      setSelectedMatch(null);
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

  const getPlayerName = (player: any) => {
    if (!player) return "TBD";
    if (player.user) {
      return `${player.user.firstName} ${player.user.lastName}`;
    }
    return player.name || `Joueur #${player.id}`;
  };

  const handleEditMatch = (match: Match) => {
    setSelectedMatch(match);
    setScoreA(match.playerAScore || 0);
    setScoreB(match.playerBScore || 0);
    setEditDialogOpen(true);
  };

  const handleSaveScore = () => {
    if (!selectedMatch) return;

    updateMatchMutation.mutate({
      matchId: selectedMatch.id,
      data: {
        playerAScore: scoreA,
        playerBScore: scoreB,
        status: scoreA !== scoreB ? "finished" : selectedMatch.status,
      },
    });
  };

  const handleStartMatch = (match: Match) => {
    updateMatchMutation.mutate({
      matchId: match.id,
      data: {
        playerAScore: match.playerAScore || 0,
        playerBScore: match.playerBScore || 0,
        status: "in_progress",
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
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
          <h3 className="text-lg font-medium">Aucun match</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Les matches seront générés automatiquement lorsque le tournoi sera
            démarré.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
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

      {/* Liste des matches */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Swords className="size-5 text-primary" />
              Gestion des matches
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatches.map((match) => {
                  const matchStatus =
                    statusConfig[match.status] ?? statusConfig.scheduled;
                  return (
                    <TableRow
                      key={match.id}
                      className="hover:bg-muted/30"
                    >
                      <TableCell className="font-medium">#{match.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              match.winner?.id === match.playerA?.id
                                ? "font-bold text-green-600"
                                : ""
                            }
                          >
                            {getPlayerName(match.playerA)}
                          </span>
                          {match.winner?.id === match.playerA?.id && (
                            <Trophy className="size-4 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2 font-mono">
                          <span
                            className={`font-bold ${
                              (match.playerAScore ?? 0) >
                              (match.playerBScore ?? 0)
                                ? "text-green-500"
                                : ""
                            }`}
                          >
                            {match.playerAScore ?? 0}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span
                            className={`font-bold ${
                              (match.playerBScore ?? 0) >
                              (match.playerAScore ?? 0)
                                ? "text-green-500"
                                : ""
                            }`}
                          >
                            {match.playerBScore ?? 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              match.winner?.id === match.playerB?.id
                                ? "font-bold text-green-600"
                                : ""
                            }
                          >
                            {getPlayerName(match.playerB)}
                          </span>
                          {match.winner?.id === match.playerB?.id && (
                            <Trophy className="size-4 text-yellow-500" />
                          )}
                        </div>
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {match.status === "scheduled" &&
                            match.playerA &&
                            match.playerB && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartMatch(match)}
                              >
                                <PlayCircle className="size-4 mr-1" />
                                Démarrer
                              </Button>
                            )}
                          {(match.status === "scheduled" ||
                            match.status === "in_progress") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditMatch(match)}
                            >
                              <Edit className="size-4 mr-1" />
                              Score
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredMatches.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Aucun match ne correspond aux filtres.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog édition score */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le score</DialogTitle>
            <DialogDescription>
              Match #{selectedMatch?.id} - Round {selectedMatch?.round}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 items-center py-4">
            <div className="text-center space-y-2">
              <Label className="text-sm text-muted-foreground">Joueur A</Label>
              <p className="font-medium">
                {getPlayerName(selectedMatch?.playerA)}
              </p>
              <Input
                type="number"
                min={0}
                value={scoreA}
                onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                className="text-center text-2xl font-bold"
              />
            </div>

            <div className="text-center text-3xl font-bold text-muted-foreground">
              VS
            </div>

            <div className="text-center space-y-2">
              <Label className="text-sm text-muted-foreground">Joueur B</Label>
              <p className="font-medium">
                {getPlayerName(selectedMatch?.playerB)}
              </p>
              <Input
                type="number"
                min={0}
                value={scoreB}
                onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                className="text-center text-2xl font-bold"
              />
            </div>
          </div>

          {scoreA === scoreB && (
            <p className="text-sm text-amber-600 text-center">
              ⚠️ Score égalité - le match ne sera pas marqué comme terminé
            </p>
          )}

          <DialogFooter>
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
