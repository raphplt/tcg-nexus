"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Trophy,
  Play,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
import { H1 } from "@/components/Shared/Titles";
import { tournamentService } from "@/services/tournament.service";
import { matchService } from "@/services/match.service";
import { Match } from "@/types/tournament";
import { useMatches } from "@/hooks/useMatches";
import { useMatchPermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { MatchScoreForm } from "../_components/MatchScoreForm";
import Link from "next/link";

export default function MatchPage() {
  const { id, matchId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const {
    data: match,
    isLoading,
    error,
    refetch
  } = useQuery<Match>({
    queryKey: ["tournament", id, "match", matchId],
    queryFn: () => tournamentService.getTournamentMatch(parseInt(id as string), parseInt(matchId as string)),
    enabled: !!id && !!matchId
  });

  const { startMatch, resetMatch, isStarting, isResetting } = useMatches(id as string);
  const permissions = useMatchPermissions(user, match);

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'final':
        return 'Finale';
      case 'semi_final':
        return 'Demi-finale';
      case 'quarter_final':
        return 'Quart de finale';
      default:
        return 'Qualification';
    }
  };

  const handleStartMatch = () => {
    if (match) {
      startMatch(match.id, { notes: `Match démarré à ${new Date().toLocaleTimeString()}` });
    }
  };

  const handleResetMatch = () => {
    if (match) {
      const reason = prompt("Raison de la réinitialisation :");
      if (reason) {
        resetMatch(match.id, { reason });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
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
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/tournaments/${id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tournoi
            </Link>
          </Button>
          
          <div className="flex-1">
            <H1 className="mb-2">
              Match #{match.id} - {getPhaseLabel(match.phase)}
            </H1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                Round {match.round}
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
          <div className="flex gap-2">
            {permissions.canStartMatch && match.status === 'scheduled' && (
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
            
            {permissions.canResetMatch && (match.status === 'finished' || match.status === 'forfeit') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetMatch}
                disabled={isResetting}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isResetting ? "Reset..." : "Reset"}
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
                  <span className="text-sm text-muted-foreground">Statut :</span>
                  <div className="mt-1">
                    {match.status === 'scheduled' && <Badge variant="outline">Programmé</Badge>}
                    {match.status === 'in_progress' && <Badge variant="secondary">En cours</Badge>}
                    {match.status === 'finished' && <Badge variant="default">Terminé</Badge>}
                    {match.status === 'forfeit' && <Badge variant="destructive">Forfait</Badge>}
                  </div>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">Phase :</span>
                  <p className="font-medium">{getPhaseLabel(match.phase)}</p>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">Round :</span>
                  <p className="font-medium">{match.round}</p>
                </div>

                {match.startedAt && (
                  <div>
                    <span className="text-sm text-muted-foreground">Démarré à :</span>
                    <p className="font-medium">{formatDate(match.startedAt)}</p>
                  </div>
                )}

                {match.finishedAt && (
                  <div>
                    <span className="text-sm text-muted-foreground">Terminé à :</span>
                    <p className="font-medium">{formatDate(match.finishedAt)}</p>
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
                    Voir le bracket
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

          {/* Formulaire de score */}
          <div className="lg:col-span-2">
            <MatchScoreForm 
              match={match} 
              onSuccess={() => {
                refetch();
                router.refresh();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
