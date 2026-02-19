"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Medal, Award, TrendingUp, RefreshCw } from "lucide-react";
import { tournamentService } from "@/services/tournament.service";
import { Ranking, Tournament } from "@/types/tournament";

interface RankingsManagerProps {
  tournamentId: number;
}

export function RankingsManager({ tournamentId }: RankingsManagerProps) {
  const { data: tournament, isLoading } = useQuery<Tournament>({
    queryKey: ["tournament", tournamentId],
    queryFn: () => tournamentService.getById(String(tournamentId)),
  });

  const rankings = tournament?.rankings || [];
  const sortedRankings = [...rankings].sort((a, b) => a.rank - b.rank);
  const topThree = sortedRankings.slice(0, 3);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="size-5 text-yellow-500" />;
      case 2:
        return <Medal className="size-5 text-gray-400" />;
      case 3:
        return <Award className="size-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30";
      case 2:
        return "from-gray-400/20 to-gray-400/5 border-gray-400/30";
      case 3:
        return "from-amber-600/20 to-amber-600/5 border-amber-600/30";
      default:
        return "from-muted/50 to-muted/20";
    }
  };

  const getPlayerName = (player: any) => {
    if (!player) return "Inconnu";
    if (player.user) {
      return `${player.user.firstName} ${player.user.lastName}`;
    }
    return player.name || `Joueur #${player.id}`;
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

  if (rankings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <Trophy className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Classement non disponible</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Le classement sera disponible une fois que les premiers matches
            auront été joués.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[topThree[1], topThree[0], topThree[2]]
            .filter((r): r is Ranking => r !== undefined)
            .map((ranking) => {
              const actualRank = ranking.rank;
              return (
                <Card
                  key={ranking.id}
                  className={`bg-linear-to-br ${getRankColor(actualRank)} ${
                    actualRank === 1 ? "sm:order-2 sm:-mt-4" : ""
                  } ${actualRank === 2 ? "sm:order-1" : ""} ${
                    actualRank === 3 ? "sm:order-3" : ""
                  }`}
                >
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-3">
                      {getRankIcon(actualRank)}
                    </div>
                    <Badge
                      variant="outline"
                      className="mb-2"
                    >
                      #{actualRank}
                    </Badge>
                    <h3 className="font-bold text-lg mb-2">
                      {getPlayerName(ranking.player)}
                    </h3>
                    <div className="grid grid-cols-3 gap-2 text-sm mt-4">
                      <div>
                        <p className="text-muted-foreground">V</p>
                        <p className="font-bold text-green-600">
                          {ranking.wins}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">D</p>
                        <p className="font-bold text-red-600">
                          {ranking.losses}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pts</p>
                        <p className="font-bold">{ranking.points}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Tableau complet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            Classement complet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16">Rang</TableHead>
                  <TableHead>Joueur</TableHead>
                  <TableHead className="text-center">Victoires</TableHead>
                  <TableHead className="text-center">Défaites</TableHead>
                  <TableHead className="text-center">Ratio</TableHead>
                  <TableHead className="text-center">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRankings.map((ranking) => {
                  const winRate = Number(ranking.winRate) || 0;
                  return (
                    <TableRow
                      key={ranking.id}
                      className={`hover:bg-muted/30 ${
                        ranking.rank <= 3 ? "bg-muted/20" : ""
                      }`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRankIcon(ranking.rank)}
                          <span
                            className={`font-bold ${
                              ranking.rank <= 3 ? "text-lg" : ""
                            }`}
                          >
                            #{ranking.rank}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {getPlayerName(ranking.player)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-600 font-semibold">
                          {ranking.wins}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-red-600 font-semibold">
                          {ranking.losses}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={winRate >= 50 ? "default" : "secondary"}
                        >
                          {winRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-lg">
                          {ranking.points}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
