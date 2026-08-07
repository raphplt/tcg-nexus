"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Play,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import GameBoard from "@/components/match/GameBoard";
import { H1 } from "@/components/Shared/Titles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useMatches } from "@/hooks/useMatches";
import { useMatchPermissions } from "@/hooks/usePermissions";
import { tournamentService } from "@/services/tournament.service";
import { Match } from "@/types/tournament";
import { MatchScoreForm } from "../_components/MatchScoreForm";
import { ResetMatchDialog } from "../_components/ResetMatchDialog";
import { useLocale } from "next-intl";

export default function MatchPage() {
  const locale = useLocale();
  const { id, matchId } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const {
    data: match,
    isLoading,
    error,
    refetch,
  } = useQuery<Match>({
    queryKey: ["tournament", id, "match", matchId],
    queryFn: () =>
      tournamentService.getTournamentMatch(
        parseInt(id as string),
        parseInt(matchId as string),
      ),
    enabled: !!id && !!matchId,
  });

  const { startMatch, resetMatch, isStarting, isResetting } = useMatches(
    id as string,
  );
  const permissions = useMatchPermissions(user, match);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const canSafelyStart =
    permissions.canStartMatch &&
    match?.tournament?.status === "in_progress" &&
    match?.round === match?.tournament?.currentRound &&
    match?.status === "scheduled" &&
    Boolean(match?.playerA && match?.playerB);
  const canSafelyReset =
    permissions.canResetMatch &&
    match?.tournament?.status === "in_progress" &&
    match?.round === match?.tournament?.currentRound &&
    (match?.status === "finished" || match?.status === "forfeit");

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case "final":
        return "Finale";
      case "semi_final":
        return "Demi-finale";
      case "quarter_final":
        return "Quart de finale";
      default:
        return "Qualification";
    }
  };

  const handleStartMatch = () => {
    if (match) {
      startMatch(match.id, {
        notes: `Match démarré à ${new Date().toLocaleTimeString()}`,
      });
    }
  };

  const handleResetMatch = () => {
    if (match) {
      setResetDialogOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-4xl mx-auto text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Match non trouvé</h1>
          <p className="text-muted-foreground mb-4">
            Le match demandé n'existe pas ou n'est pas accessible.
          </p>
          <Button asChild>
            <Link href={`/tournaments/${id}`}>Retour au tournoi</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/tournaments/${id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tournoi
            </Link>
          </Button>

          <div className="flex-1">
            <H1 className="mb-2">
              Match #{match.id} — {getPhaseLabel(match.phase)}
            </H1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                Ronde {match.round}
              </span>
              {match.scheduledDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(match.scheduledDate)}
                </span>
              )}
            </div>
          </div>

          {/* Actions rapides */}
          <div className="flex flex-wrap gap-2">
            {canSafelyStart && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartMatch}
                disabled={isStarting}
              >
                <Play className="w-4 h-4 mr-2" />
                {isStarting ? "Démarrage..." : "Démarrer"}
              </Button>
            )}

            {canSafelyReset && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetMatch}
                disabled={isResetting}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isResetting ? "Réinitialisation..." : "Réinitialiser"}
              </Button>
            )}
          </div>
        </div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informations du match */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">
                    Statut :
                  </span>
                  <div className="mt-1">
                    {match.status === "scheduled" && (
                      <Badge variant="outline">Programmé</Badge>
                    )}
                    {match.status === "in_progress" && (
                      <Badge variant="secondary">En cours</Badge>
                    )}
                    {match.status === "finished" && (
                      <Badge variant="default">Terminé</Badge>
                    )}
                    {match.status === "forfeit" && (
                      <Badge variant="destructive">Forfait</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">Phase :</span>
                  <p className="font-medium">{getPhaseLabel(match.phase)}</p>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">Ronde :</span>
                  <p className="font-medium">{match.round}</p>
                </div>

                {match.startedAt && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Démarré à :
                    </span>
                    <p className="font-medium">{formatDate(match.startedAt)}</p>
                  </div>
                )}

                {match.finishedAt && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Terminé à :
                    </span>
                    <p className="font-medium">
                      {formatDate(match.finishedAt)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <Card>
              <CardHeader>
                <CardTitle>Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/tournaments/${id}/bracket`}>
                    <Trophy className="w-4 h-4 mr-2" />
                    Voir le tableau
                  </Link>
                </Button>

                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/tournaments/${id}/matches`}>
                    <Clock className="w-4 h-4 mr-2" />
                    Tous les matches
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Zone de jeu / fallback admin */}
          <div className="lg:col-span-2">
            {permissions.isPlayerInMatch ? (
              <GameBoard matchId={match.id} />
            ) : permissions.canResetMatch ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Mode administration</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Le plateau en ligne est réservé aux deux joueurs du match.
                    Les outils ci-dessous permettent à l’organisation de saisir
                    ou corriger un résultat si nécessaire.
                  </CardContent>
                </Card>
                <MatchScoreForm
                  match={match}
                  onSuccess={() => {
                    refetch();
                    router.refresh();
                  }}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-sm text-muted-foreground">
                  Cette page permet de suivre le résultat. Le plateau de jeu est
                  accessible uniquement aux deux joueurs concernés.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <ResetMatchDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        isPending={isResetting}
        onConfirm={(reason) => {
          resetMatch(match.id, { reason });
          setResetDialogOpen(false);
        }}
      />
    </div>
  );
}
