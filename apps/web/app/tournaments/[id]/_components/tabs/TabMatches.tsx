"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { Match } from "@/types/tournament";

interface TabMatchesProps {
  matches: Match[];
  formatDate: (date?: string | null) => string;
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

const phaseTranslation: Record<string, string> = {
  qualification: "Qualification",
  quarter_final: "Quart de finale",
  semi_final: "Demi-finale",
  final: "Finale",
};

export function TabMatches({ matches, formatDate }: TabMatchesProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roundFilter, setRoundFilter] = useState<string>("all");

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
                  <TableHead>Round</TableHead>
                  <TableHead className="hidden md:table-cell">Phase</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatches.length > 0 ? (
                  filteredMatches.map((match) => {
                    const matchStatus =
                      statusConfig[match.status] ?? statusConfig.scheduled;
                    return (
                      <TableRow
                        key={match.id}
                        className="hover:bg-muted/30"
                      >
                        <TableCell className="font-medium">
                          #{match.id}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Round {match.round}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-muted-foreground">
                            {phaseTranslation[match.phase] ||
                              match.phase ||
                              "-"}
                          </span>
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
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {formatDate(match.scheduledDate)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`font-bold ${
                                match.playerAScore > match.playerBScore
                                  ? "text-green-500"
                                  : ""
                              }`}
                            >
                              {match.playerAScore ?? 0}
                            </span>
                            <span className="text-muted-foreground">-</span>
                            <span
                              className={`font-bold ${
                                match.playerBScore > match.playerAScore
                                  ? "text-green-500"
                                  : ""
                              }`}
                            >
                              {match.playerBScore ?? 0}
                            </span>
                          </div>
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
