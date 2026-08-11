"use client";

import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { tournamentService } from "@/services/tournament.service";
import { Tournament } from "@/types/tournament";
import { extractApiErrorMessage } from "@/utils/api-error";

import { TournamentHeroBanner } from "./_components/TournamentHeroBanner";
import {
  TabMatches,
  TabOrganizers,
  TabOverview,
  TabParticipants,
  TabRankings,
  TabRules,
} from "./_components/tabs";
import {
  MobileTabBar,
  type TabId,
  VerticalTabs,
} from "./_components/VerticalTabs";

function formatDate(date?: string | null) {
  const t = useTranslations("TournamentDetail");
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
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
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

const ErrorView = ({ message }: { message?: string }) => {
  const t = useTranslations("TournamentDetail");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto py-16 px-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Info className="size-5" />
              {t("loadErrorTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{message || t("loadError")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default function TournamentDetailsPage() {
  const t = useTranslations("TournamentDetail");
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
      const registration = await tournamentService.register(tournament.id, "");
      const messages = {
        confirmed: t("registrationConfirmed"),
        pending: t("registrationPending"),
        waitlisted: t("registrationWaitlisted"),
      } as const;
      toast.success(
        messages[registration.status as keyof typeof messages] ??
          t("registrationSaved"),
      );
      await queryClient.invalidateQueries({ queryKey: ["tournament", id] });
    } catch (error) {
      toast.error(extractApiErrorMessage(error, t("registerError")));
    }
  };

  const unregister = async () => {
    if (!tournament?.id || !user?.player?.id) return;
    try {
      await tournamentService.unregister(tournament.id, user.player.id);
      toast.success(t("leftTournament"));
      await queryClient.invalidateQueries({ queryKey: ["tournament", id] });
    } catch (error) {
      toast.error(extractApiErrorMessage(error, t("unregisterError")));
      throw error;
    }
  };

  const participantCount =
    tournament?.registrations?.filter(
      (registration) => registration.status === "confirmed",
    ).length || 0;
  const matchesCount = tournament?.matches?.length || 0;

  const renderTabContent = useMemo(() => {
    if (!tournament) return null;

    switch (activeTab) {
      case "overview":
        return <TabOverview tournament={tournament} formatDate={formatDate} />;
      case "participants":
        return (
          <TabParticipants registrations={tournament.registrations || []} />
        );
      case "matches":
        return (
          <TabMatches
            matches={tournament.matches || []}
            tournamentId={tournament.id}
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
          onUnregister={unregister}
          formatDate={formatDate}
        />

        <div className="lg:hidden">
          <MobileTabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isExternal={tournament.isExternal}
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
                    isExternal={tournament.isExternal}
                  />
                </CardContent>
              </Card>
            </div>
          </aside>

          <main className="flex-1 min-w-0">{renderTabContent}</main>
        </div>
      </div>
    </div>
  );
}
