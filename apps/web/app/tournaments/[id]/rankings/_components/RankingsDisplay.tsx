"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Trophy,
  Crown,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  BarChart3,
} from "lucide-react";
import { Ranking, Tournament } from "@/types/tournament";

interface RankingsDisplayProps {
  rankings: Ranking[];
  tournament?: Tournament;
  isLoading?: boolean;
}

interface PlayerStatsProps {
  ranking: Ranking;
  tournament?: Tournament;
}

function PlayerStats({ ranking, tournament }: PlayerStatsProps) {
  const winRate = ranking.winRate;
  const totalGames = ranking.wins + ranking.losses + ranking.draws;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Avatar className="w-20 h-20 mx-auto mb-3">
          <AvatarFallback className="text-2xl">
            {ranking.player.name[0]}
          </AvatarFallback>
        </Avatar>
        <h3 className="text-xl font-bold">{ranking.player.name}</h3>
        <Badge
          variant="outline"
          className="mt-1"
        >
          Rang #{ranking.rank}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-muted rounded">
          <div className="text-2xl font-bold text-blue-600">
            {ranking.points}
          </div>
          <div className="text-sm text-muted-foreground">Points</div>
        </div>
        <div className="text-center p-3 bg-muted rounded">
          <div className="text-2xl font-bold text-green-600">
            {winRate.toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground">% Victoires</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="text-center p-2 bg-green-50 rounded">
          <div className="font-bold text-green-700">{ranking.wins}</div>
          <div className="text-green-600">Victoires</div>
        </div>
        <div className="text-center p-2 bg-red-50 rounded">
          <div className="font-bold text-red-700">{ranking.losses}</div>
          <div className="text-red-600">Défaites</div>
        </div>
        <div className="text-center p-2 bg-yellow-50 rounded">
          <div className="font-bold text-yellow-700">{ranking.draws}</div>
          <div className="text-yellow-600">Égalités</div>
        </div>
      </div>

      <div className="pt-3 border-t">
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span>Total matches :</span>
            <span className="font-medium">{totalGames}</span>
          </div>
          <div className="flex justify-between">
            <span>Points par match :</span>
            <span className="font-medium">
              {totalGames > 0
                ? (ranking.points / totalGames).toFixed(2)
                : "0.00"}
            </span>
          </div>
          {tournament?.type === "swiss_system" && (
            <div className="text-xs text-muted-foreground mt-2">
              Système suisse : Victoire = 3pts, Égalité = 1pt, Défaite = 0pt
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RankingsDisplay({
  rankings,
  tournament,
  isLoading,
}: RankingsDisplayProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Ranking | null>(null);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-orange-400" />;
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">
            #{rank}
          </span>
        );
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">1er</Badge>;
    if (rank === 2) return <Badge variant="secondary">2ème</Badge>;
    if (rank === 3) return <Badge variant="outline">3ème</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 80) return "text-green-600";
    if (winRate >= 60) return "text-blue-600";
    if (winRate >= 40) return "text-orange-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-gray-200 rounded"
              ></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rankings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Aucun classement disponible pour le moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Classement général
            {tournament?.status === "in_progress" && (
              <Badge
                variant="secondary"
                className="ml-auto"
              >
                Round {tournament.currentRound}/{tournament.totalRounds}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rang</TableHead>
                <TableHead>Joueur</TableHead>
                <TableHead className="text-center">Points</TableHead>
                <TableHead className="text-center">V-D-E</TableHead>
                <TableHead className="text-center">% Victoires</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((ranking, index) => {
                const isTop3 = ranking.rank <= 3;
                const rowClass = isTop3
                  ? "bg-gradient-to-r from-yellow-50 to-transparent"
                  : "";

                return (
                  <TableRow
                    key={ranking.id}
                    className={rowClass}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRankIcon(ranking.rank)}
                        {getRankBadge(ranking.rank)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {ranking.player.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{ranking.player.name}</p>
                          {isTop3 && (
                            <p className="text-xs text-muted-foreground">
                              {ranking.rank === 1
                                ? "🏆 Champion"
                                : ranking.rank === 2
                                  ? "🥈 Vice-champion"
                                  : "🥉 3ème place"}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="font-bold text-lg">
                        {ranking.points}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="text-sm">
                        <span className="text-green-600 font-medium">
                          {ranking.wins}
                        </span>
                        <span className="text-muted-foreground mx-1">-</span>
                        <span className="text-red-600 font-medium">
                          {ranking.losses}
                        </span>
                        <span className="text-muted-foreground mx-1">-</span>
                        <span className="text-yellow-600 font-medium">
                          {ranking.draws}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <span
                        className={`font-medium ${getWinRateColor(ranking.winRate)}`}
                      >
                        {ranking.winRate.toFixed(1)}%
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPlayer(ranking)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Détails
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Statistiques détaillées</DialogTitle>
                          </DialogHeader>
                          <PlayerStats
                            ranking={ranking}
                            tournament={tournament}
                          />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Informations sur le système de points */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Système de points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            {tournament?.type === "swiss_system" && (
              <>
                <p>
                  • <strong>Victoire :</strong> 3 points
                </p>
                <p>
                  • <strong>Égalité :</strong> 1 point
                </p>
                <p>
                  • <strong>Défaite :</strong> 0 point
                </p>
                <p>
                  • <strong>Bye :</strong> 3 points (victoire automatique)
                </p>
              </>
            )}
            {tournament?.type === "round_robin" && (
              <>
                <p>
                  • <strong>Victoire :</strong> 3 points
                </p>
                <p>
                  • <strong>Égalité :</strong> 1 point
                </p>
                <p>
                  • <strong>Défaite :</strong> 0 point
                </p>
              </>
            )}
            {(tournament?.type === "single_elimination" ||
              tournament?.type === "double_elimination") && (
              <>
                <p>
                  • <strong>Victoire :</strong> 1 point (progression)
                </p>
                <p>
                  • <strong>Défaite :</strong> 0 point (élimination)
                </p>
              </>
            )}
            <p className="pt-2 border-t">
              <strong>Départage :</strong> En cas d'égalité de points, le
              classement se fait par % de victoires, puis par nombre de
              victoires.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
