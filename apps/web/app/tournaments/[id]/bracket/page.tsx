"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Download,
  RefreshCw,
  Trophy,
  Target,
  Grid3X3,
} from "lucide-react";
import { H1 } from "@/components/Shared/Titles";
import { useTournament } from "@/hooks/useTournament";
import { useBracket } from "@/hooks/useBracket";
import { EliminationBracket } from "./_components/EliminationBracket";
import { SwissPairings } from "./_components/SwissPairings";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BracketPage() {
  const { id } = useParams();
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  const { tournament, isLoading: tournamentLoading } = useTournament(
    id as string,
  );
  const {
    bracket,
    pairings,
    isLoading: bracketLoading,
    currentRound,
    totalMatches,
    completedMatches,
    progressPercentage,
    isSwiss,
    isRoundRobin,
    isElimination,
  } = useBracket(id as string);

  const isLoading = tournamentLoading || bracketLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament || !bracket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Bracket non disponible</h1>
          <p className="text-muted-foreground mb-4">
            Le bracket n'a pas encore été généré ou le tournoi n'a pas démarré.
          </p>
          <Button asChild>
            <Link href={`/tournaments/${id}`}>Retour au tournoi</Link>
          </Button>
        </div>
      </div>
    );
  }

  const getBracketTypeIcon = () => {
    switch (bracket.type) {
      case "single_elimination":
        return <Target className="w-5 h-5" />;
      case "double_elimination":
        return <Trophy className="w-5 h-5" />;
      case "swiss_system":
        return <RefreshCw className="w-5 h-5" />;
      case "round_robin":
        return <Grid3X3 className="w-5 h-5" />;
      default:
        return <Trophy className="w-5 h-5" />;
    }
  };

  const getBracketTypeName = () => {
    switch (bracket.type) {
      case "single_elimination":
        return "Élimination simple";
      case "double_elimination":
        return "Élimination double";
      case "swiss_system":
        return "Système suisse";
      case "round_robin":
        return "Round robin";
      default:
        return "Inconnu";
    }
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4 ${isFullscreen ? "fixed inset-0 z-50 bg-background" : ""}`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {!isFullscreen && (
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <Link href={`/tournaments/${id}`}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Link>
              </Button>
            )}

            <div>
              <H1 className="flex items-center gap-2 mb-2">
                {getBracketTypeIcon()}
                Bracket - {tournament.name}
              </H1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Badge variant="outline">{getBracketTypeName()}</Badge>
                <span>
                  {completedMatches}/{totalMatches} matches terminés
                </span>
                <span>{progressPercentage}% complété</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Contenu du bracket */}
        <Card className="min-h-[600px]">
          <CardContent className="p-6">
            {isElimination && (
              <EliminationBracket
                bracket={bracket}
                onMatchClick={(matchId) =>
                  router.push(`/tournaments/${id}/matches/${matchId}`)
                }
                interactive={true}
              />
            )}

            {isSwiss && pairings && (
              <SwissPairings
                pairings={pairings}
                currentRound={currentRound}
                onMatchClick={(matchId) =>
                  router.push(`/tournaments/${id}/matches/${matchId}`)
                }
                interactive={true}
              />
            )}

            {isRoundRobin && (
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">
                  Grille Round Robin
                </h3>
                <p className="text-muted-foreground">
                  Interface Round Robin à implémenter
                </p>
                {/* TODO: Implémenter RoundRobinGrid */}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation par rounds pour Swiss/Round Robin */}
        {(isSwiss || isRoundRobin) && bracket.rounds.length > 1 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Navigation par rounds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {bracket.rounds.map((round) => (
                  <Button
                    key={round.index}
                    variant={
                      selectedRound === round.index ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedRound(round.index)}
                  >
                    Round {round.index}
                    <Badge
                      variant="secondary"
                      className="ml-2"
                    >
                      {round.matches.length}
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
