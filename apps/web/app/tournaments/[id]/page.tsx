"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { tournamentService } from "@/services/tournament.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";
import { Tournament } from "@/types/tournament";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

import { TournamentHeroBanner } from "./_components/TournamentHeroBanner";
import {
  VerticalTabs,
  MobileTabBar,
  type TabId,
} from "./_components/VerticalTabs";
import {
  TabOverview,
  TabParticipants,
  TabMatches,
  TabRankings,
  TabRules,
  TabOrganizers,
} from "./_components/tabs";

function formatDate(date?: string | null) {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date;
  }
}

const LoadingView = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      <div className="rounded-2xl border p-8 space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-28" />
        </div>
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-5 w-72" />
        <div className="flex gap-3 pt-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="flex gap-6">
        <div className="hidden lg:block w-64 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-12 w-full rounded-lg"
            />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

const ErrorView = ({ message }: { message?: string }) => (
  <div className="min-h-screen bg-background">
    <div className="max-w-7xl mx-auto py-16 px-4">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Info className="size-5" /> Erreur de chargement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {message || "Impossible de récupérer les détails du tournoi."}
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default function TournamentDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const {
    data: tournament,
    isLoading,
    error,
  } = useQuery<Tournament>({
    queryKey: ["tournament", id],
    queryFn: () =>
      tournamentService.getById(id as string) as Promise<Tournament>,
  });

  const permissions = usePermissions(user, tournament);

  const register = async () => {
    if (!tournament?.id || !user?.player?.id) return;
    try {
      await tournamentService.register(tournament.id, user.player.id, "");
    } catch (error) {
      console.error("Erreur lors de l'inscription au tournoi :", error);
    }
  };

  const participantCount = tournament?.players?.length || 0;
  const matchesCount = tournament?.matches?.length || 0;

  const renderTabContent = useMemo(() => {
    if (!tournament) return null;

    switch (activeTab) {
      case "overview":
        return (
          <TabOverview
            tournament={tournament}
            formatDate={formatDate}
          />
        );
      case "participants":
        return <TabParticipants participants={tournament.players || []} />;
      case "matches":
        return (
          <TabMatches
            matches={tournament.matches || []}
            formatDate={formatDate}
          />
        );
      case "rankings":
        return <TabRankings rankings={tournament.rankings || []} />;
      case "rules":
        return <TabRules tournament={tournament} />;
      case "organizers":
        return (
          <TabOrganizers
            organizers={tournament.organizers || []}
            notifications={tournament.notifications || []}
          />
        );
      default:
        return null;
    }
  }, [activeTab, tournament]);

  if (isLoading) return <LoadingView />;
  if (error)
    return (
      <ErrorView message={error instanceof Error ? error.message : undefined} />
    );
  if (!tournament) return <ErrorView />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto py-6 md:py-8 px-4 space-y-6">
        <TournamentHeroBanner
          tournament={tournament}
          permissions={permissions}
          user={user}
          onRegister={register}
          formatDate={formatDate}
        />

        {/* Mobile Tab Bar */}
        <div className="lg:hidden">
          <MobileTabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        <div className="flex gap-6">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24">
              <Card>
                <CardContent className="p-3">
                  <VerticalTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    participantCount={participantCount}
                    matchesCount={matchesCount}
                  />
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Tab Content */}
          <main className="flex-1 min-w-0">{renderTabContent}</main>
        </div>
      </div>
    </div>
  );
}
