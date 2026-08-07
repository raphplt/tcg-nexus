"use client";

import { ArrowLeft, BarChart3, Eye, Swords, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { H1 } from "@/components/Shared/Titles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useTournament } from "@/hooks/useTournament";
import {
  tournamentStatusTranslation,
  tournamentTypeTranslation,
} from "@/utils/tournaments";
import { TournamentControls } from "../_components/TournamentControls";
import { MatchManager } from "./_components/MatchManager";
import { RankingsManager } from "./_components/RankingsManager";
import { RegistrationManager } from "./_components/RegistrationManager";

export default function TournamentAdminPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { tournament, progress, isLoading, error } = useTournament(
    id as string,
  );
  const permissions = usePermissions(user, tournament);

  useEffect(() => {
    if (!isLoading && tournament && !permissions.canViewAdmin) {
      router.replace(`/tournaments/${id}`);
    }
  }, [id, isLoading, permissions.canViewAdmin, router, tournament]);

  if (!isLoading && tournament && !permissions.canViewAdmin) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="h-64 bg-muted rounded"></div>
              <div className="lg:col-span-3 h-96 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Erreur</h1>
          <p className="text-muted-foreground">
            Impossible de charger le tournoi.
          </p>
          <Button asChild className="mt-4">
            <Link href="/tournaments">Retour aux tournois</Link>
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/tournaments/${id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tournoi
            </Link>
          </Button>

          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">Administration</Badge>
              <Badge variant="secondary">
                {tournamentStatusTranslation[
                  tournament.status as keyof typeof tournamentStatusTranslation
                ] || tournament.status}
              </Badge>
            </div>
            <H1 className="mb-2">{tournament.name}</H1>
            <p className="text-muted-foreground">
              {formatDate(tournament.startDate)} •{" "}
              {tournament.location || "Lieu non spécifié"}
            </p>
          </div>

          <Button variant="outline" asChild>
            <Link href={`/tournaments/${id}`}>
              <Eye className="w-4 h-4 mr-2" />
              Vue publique
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <TournamentControls tournament={tournament} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Vue d'ensemble
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {progress && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Progression :</span>
                      <span className="font-medium">
                        {Math.round(progress.progressPercentage)}%
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progressPercentage}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-bold text-lg">
                          {progress.activePlayers}
                        </div>
                        <div className="text-muted-foreground">
                          Joueurs actifs
                        </div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-bold text-lg">
                          {progress.completedMatches}
                        </div>
                        <div className="text-muted-foreground">
                          Matchs terminés
                        </div>
                      </div>
                    </div>

                    {tournament.status === "in_progress" && (
                      <>
                        <div className="text-center p-2 bg-blue-50 dark:bg-blue-950 rounded border">
                          <div className="font-bold text-blue-800 dark:text-blue-200">
                            Ronde {progress.currentRound}
                          </div>
                          <div className="text-blue-600 dark:text-blue-400 text-sm">
                            sur {progress.totalRounds}
                          </div>
                        </div>

                        {/* Statut du round actuel */}
                        {(() => {
                          const currentRoundMatches =
                            tournament.matches?.filter(
                              (m) => m.round === progress.currentRound,
                            ) || [];
                          const finishedMatches = currentRoundMatches.filter(
                            (m) =>
                              m.status === "finished" || m.status === "forfeit",
                          ).length;
                          const totalMatches = currentRoundMatches.length;
                          const allFinished =
                            totalMatches > 0 &&
                            finishedMatches === totalMatches;

                          return (
                            <div
                              className={`text-center p-2 rounded border ${
                                allFinished
                                  ? "bg-green-50 dark:bg-green-950 border-green-300"
                                  : "bg-yellow-50 dark:bg-yellow-950 border-yellow-300"
                              }`}
                            >
                              <div
                                className={`font-medium text-sm ${
                                  allFinished
                                    ? "text-green-700 dark:text-green-300"
                                    : "text-yellow-700 dark:text-yellow-300"
                                }`}
                              >
                                {finishedMatches}/{totalMatches} matchs terminés
                              </div>
                              {allFinished &&
                                progress.currentRound <
                                  progress.totalRounds && (
                                  <div className="text-green-600 dark:text-green-400 text-xs mt-1">
                                    Prêt pour la ronde suivante
                                  </div>
                                )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Vue d'ensemble</span>
                </TabsTrigger>
                <TabsTrigger
                  value="registrations"
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Inscriptions</span>
                </TabsTrigger>
                <TabsTrigger
                  value="matches"
                  className="flex items-center gap-2"
                >
                  <Swords className="w-4 h-4" />
                  <span className="hidden sm:inline">Matchs</span>
                </TabsTrigger>
                <TabsTrigger
                  value="rankings"
                  className="flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  <span className="hidden sm:inline">Classements</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informations générales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-muted-foreground">
                            Type :
                          </span>
                          <p className="font-medium">
                            {tournamentTypeTranslation[
                              tournament.type as keyof typeof tournamentTypeTranslation
                            ] || tournament.type}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">
                            Joueurs :
                          </span>
                          <p className="font-medium">
                            {tournament.players?.length || 0}
                            {tournament.maxPlayers &&
                              ` / ${tournament.maxPlayers}`}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">
                            Inscriptions jusqu’au :
                          </span>
                          <p className="font-medium">
                            {formatDate(
                              tournament.registrationDeadline ?? undefined,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-muted-foreground">
                            Début :
                          </span>
                          <p className="font-medium">
                            {formatDate(tournament.startDate)}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">
                            Fin prévue :
                          </span>
                          <p className="font-medium">
                            {formatDate(tournament.endDate)}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">
                            Public :
                          </span>
                          <Badge
                            variant={
                              tournament.isPublic ? "default" : "secondary"
                            }
                          >
                            {tournament.isPublic ? "Oui" : "Non"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {tournament.description && (
                      <div className="mt-6 pt-6 border-t">
                        <span className="text-sm text-muted-foreground">
                          Description :
                        </span>
                        <p className="mt-1">{tournament.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="registrations" className="mt-6">
                <RegistrationManager
                  tournamentId={tournament.id}
                  tournamentStatus={tournament.status}
                />
              </TabsContent>

              <TabsContent value="matches" className="mt-6">
                <MatchManager tournamentId={tournament.id} />
              </TabsContent>

              <TabsContent value="rankings" className="mt-6">
                <RankingsManager tournamentId={tournament.id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
