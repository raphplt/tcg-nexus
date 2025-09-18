"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Download, RefreshCw, Medal, Crown } from "lucide-react";
import { H1 } from "@/components/Shared/Titles";
import { useTournament } from "@/hooks/useTournament";
import { useRankings } from "@/hooks/useRankings";
import { RankingsDisplay } from "./_components/RankingsDisplay";
import Link from "next/link";

export default function RankingsPage() {
  const { id } = useParams();
  const { tournament } = useTournament(id as string);
  const { rankings, stats, isLoading, refetch } = useRankings(id as string);
  const [autoRefresh, setAutoRefresh] = useState(true);

  React.useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      if (tournament?.status === "in_progress") {
        refetch();
      }
    }, 30000); // Refresh toutes les 30 secondes

    return () => clearInterval(interval);
  }, [autoRefresh, tournament?.status, refetch]);

  const exportRankings = () => {
    if (!rankings.length) return;
    
    const csv = [
      ["Rang", "Joueur", "Points", "Victoires", "Défaites", "Égalités", "% Victoires"].join(","),
      ...rankings.map(r => [
        r.rank,
        r.player.name,
        r.points,
        r.wins,
        r.losses,
        r.draws,
        r.winRate.toFixed(1)
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `classement-${tournament?.name}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/tournaments/${id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au tournoi
              </Link>
            </Button>
            
            <div>
              <H1 className="mb-2">Classements - {tournament?.name}</H1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {stats && (
                  <>
                    <span>{stats.totalPlayers} joueurs</span>
                    <span>{stats.totalMatches} matches joués</span>
                    <span>{stats.perfectRecord} sans défaite</span>
                  </>
                )}
                {tournament?.status === "in_progress" && (
                  <Badge variant="secondary" className="animate-pulse">
                    Mise à jour automatique
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? "Auto" : "Manuel"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportRankings}
              disabled={rankings.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </div>

        {/* Podium pour les 3 premiers */}
        {rankings.length >= 3 && tournament?.status === "finished" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Podium
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {/* 2ème place */}
                <div className="text-center order-1">
                  <div className="bg-gray-100 rounded-lg p-4 h-24 flex items-end justify-center">
                    <Medal className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="mt-2">
                    <p className="font-bold">{rankings[1]?.player.name}</p>
                    <p className="text-sm text-muted-foreground">{rankings[1]?.points} pts</p>
                  </div>
                </div>

                {/* 1ère place */}
                <div className="text-center order-2">
                  <div className="bg-yellow-100 rounded-lg p-4 h-32 flex items-end justify-center">
                    <Crown className="w-10 h-10 text-yellow-500" />
                  </div>
                  <div className="mt-2">
                    <p className="font-bold text-lg">{rankings[0]?.player.name}</p>
                    <p className="text-sm text-muted-foreground">{rankings[0]?.points} pts</p>
                    <Badge variant="default" className="mt-1">Champion</Badge>
                  </div>
                </div>

                {/* 3ème place */}
                <div className="text-center order-3">
                  <div className="bg-orange-100 rounded-lg p-4 h-20 flex items-end justify-center">
                    <Medal className="w-6 h-6 text-orange-400" />
                  </div>
                  <div className="mt-2">
                    <p className="font-bold">{rankings[2]?.player.name}</p>
                    <p className="text-sm text-muted-foreground">{rankings[2]?.points} pts</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistiques globales */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalPlayers}</div>
                <div className="text-sm text-muted-foreground">Joueurs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.totalMatches}</div>
                <div className="text-sm text-muted-foreground">Matches</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.avgPoints}</div>
                <div className="text-sm text-muted-foreground">Points moy.</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.perfectRecord}</div>
                <div className="text-sm text-muted-foreground">Sans défaite</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Classement détaillé */}
        <RankingsDisplay 
          rankings={rankings}
          tournament={tournament}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
