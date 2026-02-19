"use client";

import React from "react";
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
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { Ranking } from "@/types/tournament";

interface TabRankingsProps {
  rankings: Ranking[];
}

const getPlayerName = (player: any): string => {
  if (!player) return "Inconnu";
  if (player.user) {
    return `${player.user.firstName} ${player.user.lastName}`;
  }
  return player.name || `Joueur #${player.id}`;
};

export function TabRankings({ rankings }: TabRankingsProps) {
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
      {/* Podium - Top 3 */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Réorganiser pour afficher 2-1-3 sur desktop */}
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
                      <div
                        className={`p-3 rounded-full ${
                          actualRank === 1
                            ? "bg-yellow-500/20"
                            : actualRank === 2
                              ? "bg-gray-400/20"
                              : "bg-amber-600/20"
                        }`}
                      >
                        {getRankIcon(actualRank)}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="mb-2 text-lg font-bold px-4 py-1"
                    >
                      #{actualRank}
                    </Badge>
                    <h3 className="font-semibold text-lg mt-2">
                      {getPlayerName(ranking.player)}
                    </h3>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {ranking.points}
                        </p>
                        <p className="text-xs text-muted-foreground">Points</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-500">
                          {ranking.wins}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Victoires
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-muted-foreground">
                          {Number(ranking.winRate || 0).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Win Rate
                        </p>
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
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
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
                  <TableHead className="text-center">Points</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">
                    V
                  </TableHead>
                  <TableHead className="text-center hidden sm:table-cell">
                    D
                  </TableHead>
                  <TableHead className="text-center hidden sm:table-cell">
                    N
                  </TableHead>
                  <TableHead className="text-center hidden md:table-cell">
                    Win Rate
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRankings.map((ranking) => (
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
                            ranking.rank === 1
                              ? "text-yellow-500"
                              : ranking.rank === 2
                                ? "text-gray-400"
                                : ranking.rank === 3
                                  ? "text-amber-600"
                                  : ""
                          }`}
                        >
                          #{ranking.rank}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {getPlayerName(ranking.player)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className="font-bold"
                      >
                        {ranking.points}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell text-green-500 font-medium">
                      {ranking.wins}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell text-red-500 font-medium">
                      {ranking.losses}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell text-muted-foreground">
                      {ranking.draws}
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${Number(ranking.winRate || 0)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Number(ranking.winRate || 0).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
