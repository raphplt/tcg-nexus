"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Clock,
  CheckCircle,
  X,
  Shield,
  UserCheck,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { H1 } from "@/components/Shared/Titles";
import { useAuth } from "@/contexts/AuthContext";
import { tournamentService } from "@/services/tournament.service";
import { Tournament } from "@/types/tournament";
import { PaginatedResult } from "@/types/pagination";
import { Link } from "@/i18n/navigation";
import { TournamentStats } from "./components/TournamentStats";
import { TournamentList } from "./components/TournamentList";
import { useTranslations } from "next-intl";

export default function MyTournamentsPage() {
  const t = useTranslations("Dashboard.myTournaments");
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<"player" | "organizer">("player");
  const [activePlayerTab, setActivePlayerTab] = useState("active");
  const [activeOrganizerTab, setActiveOrganizerTab] = useState("all");

  // Player Tournaments Query
  const { data: paginatedTournaments, isLoading: isPlayerLoading } = useQuery<
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

  // Organizer Tournaments Query
  const { data: paginatedOrganizedTournaments, isLoading: isOrganizerLoading } =
    useQuery<PaginatedResult<Tournament>>({
      queryKey: ["organizer", user?.id, "tournaments"],
      queryFn: () => {
        if (!user?.id) {
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
        return tournamentService.getOrganizerTournaments(user.id);
      },
      enabled: !!user?.id,
    });

  const playerTournaments = paginatedTournaments?.data || [];
  const organizedTournaments = paginatedOrganizedTournaments?.data || [];

  const activePlayerTournaments = playerTournaments.filter(
    (t) =>
      t.status === "registration_open" ||
      t.status === "registration_closed" ||
      t.status === "in_progress",
  );

  const finishedPlayerTournaments = playerTournaments.filter(
    (t) => t.status === "finished",
  );

  const cancelledPlayerTournaments = playerTournaments.filter(
    (t) => t.status === "cancelled",
  );

  const activeOrganizedTournaments = organizedTournaments.filter(
    (t) =>
      t.status === "registration_open" ||
      t.status === "registration_closed" ||
      t.status === "in_progress",
  );

  const finishedOrganizedTournaments = organizedTournaments.filter(
    (t) => t.status === "finished",
  );

  const stats = {
    total: playerTournaments.length,
    active: activePlayerTournaments.length,
    finished: finishedPlayerTournaments.length,
    wins: finishedPlayerTournaments.filter((t) => {
      const playerRanking = t.rankings?.find(
        (r) => r.player.id === user?.player?.id,
      );
      return playerRanking?.rank === 1;
    }).length,
    avgRank:
      finishedPlayerTournaments.length > 0
        ? finishedPlayerTournaments.reduce((sum, t) => {
            const ranking = t.rankings?.find(
              (r) => r.player.id === user?.player?.id,
            );
            return sum + (ranking?.rank || 999);
          }, 0) / finishedPlayerTournaments.length
        : 0,
  };

  const hasOrganizedTournaments = organizedTournaments.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <H1 className="mb-2">{t("title")}</H1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/tournaments/create">
                <Plus className="w-4 h-4 mr-2" />
                Créer un tournoi
              </Link>
            </Button>
            <Button asChild>
              <Link href="/tournaments">
                <Trophy className="w-4 h-4 mr-2" />
                {t("discover")}
              </Link>
            </Button>
          </div>
        </div>

        {/* Top-Level Mode Selector: Player vs Organizer */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Button
            variant={mainTab === "player" ? "default" : "ghost"}
            onClick={() => setMainTab("player")}
            className="flex items-center gap-2 font-medium"
          >
            <UserCheck className="w-4 h-4" />
            Mes Participations ({playerTournaments.length})
          </Button>

          <Button
            variant={mainTab === "organizer" ? "default" : "ghost"}
            onClick={() => setMainTab("organizer")}
            className="flex items-center gap-2 font-medium relative"
          >
            <Shield className="w-4 h-4 text-amber-500" />
            Tournois Organisés
            {organizedTournaments.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {organizedTournaments.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* View 1: Player Tournaments */}
        {mainTab === "player" && (
          <div className="space-y-6">
            {!user?.player ? (
              <div className="max-w-xl mx-auto text-center bg-card/60 p-8 rounded-2xl border">
                <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h2 className="text-lg font-bold mb-1">
                  {t("playerRequiredTitle")}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("playerRequiredDescription")}
                </p>
                <Button asChild>
                  <Link href="/tournaments">{t("discover")}</Link>
                </Button>
              </div>
            ) : (
              <>
                <TournamentStats stats={stats} />

                <Tabs
                  value={activePlayerTab}
                  onValueChange={setActivePlayerTab}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger
                      value="active"
                      className="flex items-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      {t("tabs.active", { count: stats.active })}
                    </TabsTrigger>
                    <TabsTrigger
                      value="finished"
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {t("tabs.finished", { count: stats.finished })}
                    </TabsTrigger>
                    <TabsTrigger
                      value="cancelled"
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      {t("tabs.cancelled", {
                        count: cancelledPlayerTournaments.length,
                      })}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="active" className="mt-6">
                    <TournamentList
                      tournaments={activePlayerTournaments}
                      isLoading={isPlayerLoading}
                      showRanking={false}
                    />
                  </TabsContent>

                  <TabsContent value="finished" className="mt-6">
                    <TournamentList
                      tournaments={finishedPlayerTournaments}
                      isLoading={isPlayerLoading}
                      showRanking={true}
                      userId={user.player.id}
                    />
                  </TabsContent>

                  <TabsContent value="cancelled" className="mt-6">
                    <TournamentList
                      tournaments={cancelledPlayerTournaments}
                      isLoading={isPlayerLoading}
                      showRanking={false}
                    />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        )}

        {/* View 2: Organizer Tournaments */}
        {mainTab === "organizer" && (
          <div className="space-y-6">
            <Tabs
              value={activeOrganizerTab}
              onValueChange={setActiveOrganizerTab}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Tous ({organizedTournaments.length})
                </TabsTrigger>
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  En cours / Ouverts ({activeOrganizedTournaments.length})
                </TabsTrigger>
                <TabsTrigger
                  value="finished"
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Terminés ({finishedOrganizedTournaments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <TournamentList
                  tournaments={organizedTournaments}
                  isLoading={isOrganizerLoading}
                  isOrganizerView={true}
                />
              </TabsContent>

              <TabsContent value="active" className="mt-6">
                <TournamentList
                  tournaments={activeOrganizedTournaments}
                  isLoading={isOrganizerLoading}
                  isOrganizerView={true}
                />
              </TabsContent>

              <TabsContent value="finished" className="mt-6">
                <TournamentList
                  tournaments={finishedOrganizedTournaments}
                  isLoading={isOrganizerLoading}
                  isOrganizerView={true}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
