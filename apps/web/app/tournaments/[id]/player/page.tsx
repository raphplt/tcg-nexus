"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Trophy,
  Clock,
  CheckCircle,
  X,
  TrendingUp,
  Target,
  Calendar,
  User,
  BarChart3,
} from "lucide-react";
import { H1 } from "@/components/Shared/Titles";
import { useTournament } from "@/hooks/useTournament";
import { useRankings } from "@/hooks/useRankings";
import { useAuth } from "@/contexts/AuthContext";
import { matchService } from "@/services/match.service";
import { Match } from "@/types/tournament";
import Link from "next/link";

export default function PlayerDashboardPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { tournament } = useTournament(id as string);
  const { getPlayerRanking } = useRankings(id as string);

  // Récupérer les matches du joueur
  const { data: playerMatches = [] } = useQuery<Match[]>({
    queryKey: ["player", user?.player?.id, "tournament", id, "matches"],
    queryFn: () =>
      matchService.getPlayerMatches(user!.player!.id, parseInt(id as string)),
    enabled: !!user?.player?.id && !!id,
  });

  // Classement du joueur
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
      return <Badge variant="outline">À jouer</Badge>;
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
    return new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const nextMatch = playerMatches.find(
    (m) => m.status === "scheduled" || m.status === "in_progress",
  );
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

  if (!user?.player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Profil joueur requis</h1>
          <p className="text-muted-foreground mb-4">
            Vous devez avoir un profil joueur pour accéder à cette page.
          </p>
          <Button asChild>
            <Link href={`/tournaments/${id}`}>Retour au tournoi</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <Link href={`/tournaments/${id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tournoi
            </Link>
          </Button>

          <div className="flex-1">
            <H1 className="mb-2">Mon Dashboard - {tournament?.name}</H1>
            <p className="text-muted-foreground">
              Suivi de votre participation au tournoi
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Stats du joueur */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profil joueur */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Mon profil
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-4">
                  <AvatarFallback className="text-2xl">
                    {user.player.name[0]}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold mb-2">{user.player.name}</h3>

                {playerRanking && (
                  <div className="space-y-2">
                    <Badge
                      variant="outline"
                      className="text-lg px-3 py-1"
                    >
                      Rang #{playerRanking.rank}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {playerRanking.points} points
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistiques personnelles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Mes statistiques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-green-50 rounded">
                    <div className="font-bold text-green-700">{wins}</div>
                    <div className="text-xs text-green-600">Victoires</div>
                  </div>
                  <div className="p-2 bg-red-50 rounded">
                    <div className="font-bold text-red-700">{losses}</div>
                    <div className="text-xs text-red-600">Défaites</div>
                  </div>
                  <div className="p-2 bg-yellow-50 rounded">
                    <div className="font-bold text-yellow-700">{draws}</div>
                    <div className="text-xs text-yellow-600">Égalités</div>
                  </div>
                </div>

                {playerRanking && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Points :</span>
                      <span className="font-medium">
                        {playerRanking.points}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>% Victoires :</span>
                      <span className="font-medium">
                        {playerRanking.winRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prochain match */}
            {nextMatch && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Prochain match
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(nextMatch.status)}
                      <span className="font-medium">
                        Round {nextMatch.round}
                      </span>
                    </div>

                    <div className="text-center p-3 bg-muted rounded">
                      <p className="font-medium">VS</p>
                      <p className="text-lg">{getOpponent(nextMatch)?.name}</p>
                    </div>

                    {nextMatch.scheduledDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {formatDate(nextMatch.scheduledDate)}
                      </div>
                    )}

                    <Button
                      className="w-full"
                      asChild
                    >
                      <Link href={`/tournaments/${id}/matches/${nextMatch.id}`}>
                        Voir le match
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contenu principal - Historique des matches */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Mes matches
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Round</TableHead>
                      <TableHead>Adversaire</TableHead>
                      <TableHead>Résultat</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerMatches.length > 0 ? (
                      playerMatches
                        .sort((a, b) => a.round - b.round)
                        .map((match) => {
                          const opponent = getOpponent(match);
                          const result = getMatchResult(match);

                          return (
                            <TableRow key={match.id}>
                              <TableCell>
                                <Badge variant="outline">
                                  Round {match.round}
                                </Badge>
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="text-xs">
                                      {opponent?.name[0] || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{opponent?.name || "TBD"}</span>
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
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <Link
                                    href={`/tournaments/${id}/matches/${match.id}`}
                                  >
                                    Voir
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8"
                        >
                          <div className="text-muted-foreground">
                            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Aucun match programmé pour le moment</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Liens rapides */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Button
                variant="outline"
                className="h-auto p-4"
                asChild
              >
                <Link href={`/tournaments/${id}/bracket`}>
                  <div className="text-center">
                    <Trophy className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Bracket</div>
                    <div className="text-xs text-muted-foreground">
                      Voir la progression
                    </div>
                  </div>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4"
                asChild
              >
                <Link href={`/tournaments/${id}/rankings`}>
                  <div className="text-center">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Classements</div>
                    <div className="text-xs text-muted-foreground">
                      Voir ma position
                    </div>
                  </div>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4"
                asChild
              >
                <Link href={`/tournaments/${id}/matches`}>
                  <div className="text-center">
                    <Clock className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Tous les matches</div>
                    <div className="text-xs text-muted-foreground">
                      Voir le planning
                    </div>
                  </div>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
