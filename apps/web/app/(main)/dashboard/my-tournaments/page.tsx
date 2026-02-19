"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Clock, CheckCircle, X } from "lucide-react";
import { H1 } from "@/components/Shared/Titles";
import { useAuth } from "@/contexts/AuthContext";
import { tournamentService } from "@/services/tournament.service";
import { Tournament } from "@/types/tournament";
import { PaginatedResult } from "@/types/pagination";
import Link from "next/link";
import { TournamentStats } from "./components/TournamentStats";
import { TournamentList } from "./components/TournamentList";

export default function MyTournamentsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("active");

  // Récupérer les tournois du joueur
  const { data: paginatedTournaments, isLoading } = useQuery<
    PaginatedResult<Tournament>
  >({
    queryKey: ["player", user?.player?.id, "tournaments"],
    queryFn: () => {
      if (!user?.player?.id) {
        return Promise.resolve({
          data: [],
          meta: {
            totalItems: 0,
            itemCount: 0,
            itemsPerPage: 10,
            totalPages: 0,
            currentPage: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }
      return tournamentService.getPlayerTournaments(user.player.id);
    },
    enabled: !!user?.player?.id,
  });

  const playerTournaments = paginatedTournaments?.data || [];

  // Séparer les tournois par statut
  const activeTournaments = playerTournaments.filter(
    (t) =>
      t.status === "registration_open" ||
      t.status === "registration_closed" ||
      t.status === "in_progress",
  );

  const finishedTournaments = playerTournaments.filter(
    (t) => t.status === "finished",
  );

  const cancelledTournaments = playerTournaments.filter(
    (t) => t.status === "cancelled",
  );

  // Statistiques globales
  const stats = {
    total: playerTournaments.length,
    active: activeTournaments.length,
    finished: finishedTournaments.length,
    wins: finishedTournaments.filter((t) => {
      // Vérifier si le joueur a gagné (rang 1)
      const playerRanking = t.rankings?.find(
        (r) => r.player.id === user?.player?.id,
      );
      return playerRanking?.rank === 1;
    }).length,
    avgRank:
      finishedTournaments.length > 0
        ? finishedTournaments.reduce((sum, t) => {
            const ranking = t.rankings?.find(
              (r) => r.player.id === user?.player?.id,
            );
            return sum + (ranking?.rank || 999);
          }, 0) / finishedTournaments.length
        : 0,
  };

  if (!user?.player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Profil joueur requis</h1>
          <p className="text-muted-foreground mb-4">
            Vous devez avoir un profil joueur pour voir vos tournois.
          </p>
          <Button asChild>
            <Link href="/tournaments">Découvrir les tournois</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <H1 className="mb-2">Mes Tournois</H1>
            <p className="text-muted-foreground">
              Suivi de toutes vos participations
            </p>
          </div>

          <Button asChild>
            <Link href="/tournaments">
              <Trophy className="w-4 h-4 mr-2" />
              Découvrir des tournois
            </Link>
          </Button>
        </div>

        {/* Statistiques globales */}
        <TournamentStats stats={stats} />

        {/* Onglets par statut */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="active"
              className="flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Actifs ({stats.active})
            </TabsTrigger>
            <TabsTrigger
              value="finished"
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Terminés ({stats.finished})
            </TabsTrigger>
            <TabsTrigger
              value="cancelled"
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Annulés ({cancelledTournaments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="active"
            className="mt-6"
          >
            <TournamentList
              tournaments={activeTournaments}
              isLoading={isLoading}
              showRanking={false}
            />
          </TabsContent>

          <TabsContent
            value="finished"
            className="mt-6"
          >
            <TournamentList
              tournaments={finishedTournaments}
              isLoading={isLoading}
              showRanking={true}
              userId={user.player.id}
            />
          </TabsContent>

          <TabsContent
            value="cancelled"
            className="mt-6"
          >
            <TournamentList
              tournaments={cancelledTournaments}
              isLoading={isLoading}
              showRanking={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
