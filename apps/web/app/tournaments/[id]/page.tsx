"use client";
import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { tournamentService } from "@/services/tournament.service";
import { H2 } from "@/components/Shared/Titles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Info, Bell, ListChecks } from "lucide-react";
import { formatPricing } from "@/utils/price";
import { Tournament } from "@/types/tournament";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { TournamentHeader } from "./_components/TournamentHeader";
import { TournamentStats } from "./_components/TournamentStats";
import { TournamentOverview } from "./_components/TournamentOverview";
import { ParticipantsTable } from "./_components/ParticipantsTable";
import { MatchesTable } from "./_components/MatchesTable";
import { RankingsTable } from "./_components/RankingsTable";
import { Badge } from "@/components/ui/badge";

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
  <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
    <div className="space-y-3">
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-28" />
      </div>
      <Skeleton className="h-5 w-72" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-7 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-40" />
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  </div>
);

const ErrorView = ({ message }: { message?: string }) => (
  <div className="max-w-6xl mx-auto py-16 px-4">
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
);

export default function TournamentDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();

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

  const headerSubtitle = useMemo(() => {
    const dateRange = `${formatDate(tournament?.startDate)} → ${formatDate(tournament?.endDate)}`;
    const loc = tournament?.location ? ` • ${tournament.location}` : "";
    return `${dateRange}${loc}`;
  }, [tournament?.startDate, tournament?.endDate, tournament?.location]);

  if (isLoading) return <LoadingView />;
  if (error)
    return (
      <ErrorView message={error instanceof Error ? error.message : undefined} />
    );

  if (!tournament) return <ErrorView />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
        {/* Header */}
        <TournamentHeader
          tournament={tournament}
          permissions={permissions}
          user={user}
          onRegister={register}
          formatDate={formatDate}
        />

        {/* Key stats */}
        <TournamentStats
          participantCount={participantCount}
          matchesCount={matchesCount}
          tournamentType={tournament.type}
          tournamentStatus={tournament.status}
        />

        {/* Overview */}
        <TournamentOverview
          tournament={tournament}
          headerSubtitle={headerSubtitle}
          formatDate={formatDate}
        />

        {/* Participants */}
        <section
          id="participants"
          className="space-y-3"
        >
          <H2>Participants</H2>
          <Card>
            <CardContent className="p-0">
              <ParticipantsTable participants={tournament.players || []} />
            </CardContent>
          </Card>
        </section>

        {/* Matches */}
        <section
          id="matches"
          className="space-y-3"
        >
          <H2>Matches</H2>
          <Card>
            <CardContent className="p-0">
              <MatchesTable
                matches={tournament.matches || []}
                formatDate={formatDate}
              />
            </CardContent>
          </Card>
        </section>

        {/* Classement */}
        <section
          id="classement"
          className="space-y-3"
        >
          <H2>Classement</H2>
          <Card>
            <CardContent className="p-0">
              <RankingsTable rankings={tournament.rankings || []} />
            </CardContent>
          </Card>
        </section>

        {/* Infos & Règles */}
        <section
          id="infos"
          className="space-y-3"
        >
          <H2>Infos & Règles</H2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="size-5" /> Règlement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tournament.rules ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                    {tournament.rules}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun règlement fourni.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="size-5" /> Informations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow
                  label="Public"
                  value={tournament.isPublic ? "Oui" : "Non"}
                />
                <InfoRow
                  label="Validation"
                  value={tournament.requiresApproval ? "Requise" : "Non"}
                />
                <InfoRow
                  label="Retard autorisé"
                  value={tournament.allowLateRegistration ? "Oui" : "Non"}
                />
                <InfoRow
                  label="Tarif"
                  value={formatPricing(tournament.pricing)}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Organisateurs & Notifications */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" /> Organisateurs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tournament.organizers?.length ? (
                <ul className="space-y-3">
                  {tournament.organizers.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {o.name?.slice(0, 2)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{o.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {o.role || "Organisateur"}
                          </div>
                        </div>
                      </div>
                      {o.email && (
                        <span className="text-xs text-muted-foreground">
                          {o.email}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun organisateur renseigné.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5" /> Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tournament.notifications?.length ? (
                <ul className="space-y-3">
                  {tournament.notifications.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-start justify-between gap-4 text-sm"
                    >
                      <div>
                        <div className="font-medium">{n.title}</div>
                        {n.message && (
                          <div className="text-muted-foreground text-xs">
                            {n.message}
                          </div>
                        )}
                      </div>
                      {n.status && (
                        <Badge
                          variant="outline"
                          className="capitalize"
                        >
                          {n.status}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune notification.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
