"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { tournamentService } from "@/services/tournament.service";
import type { PaginatedResult } from "@/types/pagination";
import {
  tournamentStatusTranslation,
  tournamentTypeTranslation,
} from "@/utils/tournaments";
import { Tournament } from "@/types/tournament";
import { TournamentsFilters } from "./_components/TournamentsFilters";
import { TournamentsTable } from "./_components/TournamentsTable";
import { TournamentsPagination } from "./_components/TournamentsPagination";
import {
  typeOptions,
  statusOptions,
  sortOptions,
  statusColor,
  typeColor,
} from "./utils";
import { H1, H2 } from "@/components/Shared/Titles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Trophy,
  Users,
  MapPin,
  Sparkles,
} from "lucide-react";

export default function TournamentsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    status: "",
    location: "",
    startDateFrom: "",
    startDateTo: "",
    sortBy: "startDate",
    sortOrder: "ASC" as "ASC" | "DESC",
  });

  const { data, isLoading, error } = usePaginatedQuery<
    PaginatedResult<Tournament>
  >(
    [
      "tournaments",
      page,
      filters.search,
      filters.type,
      filters.status,
      filters.location,
      filters.startDateFrom,
      filters.startDateTo,
      filters.sortBy,
      filters.sortOrder,
    ],
    tournamentService.getPaginated,
    {
      page,
      limit: 8,
      search: filters.search || undefined,
      type: filters.type || undefined,
      status: filters.status || undefined,
      location: filters.location || undefined,
      startDateFrom: filters.startDateFrom || undefined,
      startDateTo: filters.startDateTo || undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    },
  );

  const {
    data: upcoming,
    isLoading: loadingUpcoming,
    error: upcomingError,
  } = useQuery<PaginatedResult<Tournament>>({
    queryKey: ["tournaments", "upcoming", { limit: 6 }],
    queryFn: () =>
      tournamentService.getUpcomingTournaments({
        page: 1,
        limit: 6,
        sortBy: "startDate",
        sortOrder: "ASC",
      }),
  });

  const {
    data: past,
    isLoading: loadingPast,
    error: pastError,
  } = useQuery<Tournament[]>({
    queryKey: ["tournaments", "past", { limit: 6 }],
    queryFn: () => tournamentService.getPastTournaments({ limit: 6 }),
  });

  const resetFilters = () => {
    setFilters({
      search: "",
      type: "",
      status: "",
      location: "",
      startDateFrom: "",
      startDateTo: "",
      sortBy: "startDate",
      sortOrder: "ASC",
    });
    setPage(1);
  };

  const tableHeaders: { label: string; key: keyof Tournament }[] = [
    { label: "Nom", key: "name" },
    { label: "Date", key: "startDate" },
    { label: "Lieu", key: "location" },
    { label: "Type", key: "type" },
    { label: "Statut", key: "status" },
  ];

  const upcomingItems = useMemo(
    () => upcoming?.data ?? [],
    [upcoming?.data],
  );

  const pastItems = useMemo(() => past ?? [], [past]);

  const highlightedWinners = useMemo(
    () =>
      pastItems.slice(0, 4).map((tournament) => {
        const champion = tournament.rankings?.find((r) => r.rank === 1);
        return {
          tournament,
          winner:
            champion?.player?.name ||
            champion?.player?.user?.firstName ||
            "Gagnant à confirmer",
        };
      }),
    [pastItems],
  );

  const totalTournaments = data?.meta.totalItems ?? 0;
  const upcomingCount = upcomingItems.length;
  const finishedCount = pastItems.length;

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/10 via-secondary/5 to-secondary/20 py-10 px-4 md:px-8">
      <div className="max-w-3/4 mx-auto space-y-12">
        <header className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="space-y-3">
              <Trophy className="size-10 text-primary" />
              <H1
                className="text-4xl md:text-5xl font-bold"
                variant="primary"
              >
                Tournois Pokémon
              </H1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Un hub complet pour découvrir les prochains tournois, suivre les
                résultats récents et célébrer les champions de la communauté.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button
                asChild
                size="lg"
              >
                <Link href="/tournaments/create">
                  Créer un tournoi
                  <Sparkles className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
              >
                <Link href="#listing">
                  Parcourir les tournois
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatPill
                label="Tournois référencés"
                value={totalTournaments}
              />
              <StatPill
                label="Prochains événements"
                value={upcomingCount}
              />
              <StatPill
                label="Derniers résultats"
                value={finishedCount}
              />
            </div>
          </div>

          <Card className="border-primary/10 shadow-lg bg-card/80 backdrop-blur">
            <CardContent className="p-6 grid grid-cols-2 gap-4">
              <InsightBlock
                icon={CalendarClock}
                title="Prochains rendez-vous"
                value={
                  loadingUpcoming
                    ? "Chargement..."
                    : upcomingItems[0]?.startDate
                      ? new Date(
                          upcomingItems[0].startDate,
                        ).toLocaleDateString()
                      : "À confirmer"
                }
                description={
                  upcomingItems[0]?.location || "Lieu communiqué bientôt"
                }
              />
              <InsightBlock
                icon={Users}
                title="Communauté active"
                value={`${Math.max(totalTournaments, 1)} tournois`}
                description="Organisés par nos joueurs"
              />
              <InsightBlock
                icon={MapPin}
                title="Formats variés"
                value="Suisse, élimination..."
                description="Adaptez vos stratégies"
              />
              <InsightBlock
                icon={Trophy}
                title="Champions mis en avant"
                value={highlightedWinners[0]?.winner || "À découvrir"}
                description={highlightedWinners[0]?.tournament.name}
              />
            </CardContent>
          </Card>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarClock className="w-6 h-6 text-primary" />
              <H2>Prochains tournois</H2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters((prev) => ({
                  ...prev,
                  status: "registration_open",
                }));
                setPage(1);
              }}
            >
              Filtrer par inscriptions ouvertes
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          {loadingUpcoming ? (
            <SkeletonGrid />
          ) : upcomingError ? (
            <EmptyState message="Impossible de charger les prochains tournois." />
          ) : upcomingItems.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingItems.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  tournamentStatusTranslation={tournamentStatusTranslation}
                  tournamentTypeTranslation={tournamentTypeTranslation}
                  statusColor={statusColor}
                  typeColor={typeColor}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="Aucun tournoi à venir pour le moment." />
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-primary" />
              <H2>Derniers tournois</H2>
            </div>
            {loadingPast ? (
              <SkeletonGrid />
            ) : pastError ? (
              <EmptyState message="Impossible de charger les derniers tournois." />
            ) : pastItems.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastItems.map((tournament) => (
                  <ResultCard
                    key={tournament.id}
                    tournament={tournament}
                    tournamentStatusTranslation={tournamentStatusTranslation}
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="Aucun tournoi passé pour le moment." />
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" />
              <H2>Derniers gagnants</H2>
            </div>
            <Card className="bg-card/80 backdrop-blur border-primary/10">
              <CardContent className="p-4 space-y-3">
                {loadingPast ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-14 w-full"
                      />
                    ))}
                  </div>
                ) : highlightedWinners.length ? (
                  highlightedWinners.map(({ tournament, winner }) => (
                    <Link
                      key={tournament.id}
                      href={`/tournaments/${tournament.id}`}
                      className="flex items-center justify-between rounded-lg border bg-background/60 px-3 py-2 hover:border-primary/50 transition"
                    >
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tournament.endDate).toLocaleDateString()}
                        </p>
                        <p className="font-semibold truncate max-w-[220px]">
                          {tournament.name}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {winner}
                      </span>
                    </Link>
                  ))
                ) : (
                  <EmptyState message="Pas encore de gagnants référencés." />
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section
          id="listing"
          className="space-y-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <H2 className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-primary" />
              Explorer tous les tournois
            </H2>
            <p className="text-sm text-muted-foreground">
              Affinez par format, statut, localisation ou période.
            </p>
          </div>

          <TournamentsFilters
            filters={filters}
            setFilters={(newFilters) => {
              setFilters((prev) => ({ ...prev, ...newFilters }));
              setPage(1);
            }}
            typeOptions={typeOptions}
            statusOptions={statusOptions}
            sortOptions={sortOptions}
            resetFilters={resetFilters}
          />

          <div className="rounded-xl shadow-2xl bg-card/80 backdrop-blur-md border border-border overflow-hidden">
            <TournamentsTable
              data={data}
              isLoading={isLoading}
              error={error}
              tableHeaders={tableHeaders}
              statusColor={statusColor}
              typeColor={typeColor}
              tournamentStatusTranslation={tournamentStatusTranslation}
              tournamentTypeTranslation={tournamentTypeTranslation}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              setFilters={(f) => setFilters((prev) => ({ ...prev, ...f }))}
            />
          </div>
          {data && (
            <TournamentsPagination
              meta={data.meta}
              page={page}
              setPage={setPage}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-semibold">
      <span className="text-xs uppercase tracking-wide text-primary/80">
        {label}
      </span>
      <span className="text-base text-primary">{value}</span>
    </div>
  );
}

function InsightBlock({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border bg-background/60 p-4 space-y-2 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </div>
      <p className="text-lg font-semibold leading-tight">{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function TournamentCard({
  tournament,
  tournamentStatusTranslation,
  tournamentTypeTranslation,
  statusColor,
  typeColor,
}: {
  tournament: Tournament;
  tournamentStatusTranslation: Record<string, string>;
  tournamentTypeTranslation: Record<string, string>;
  statusColor: Record<string, string>;
  typeColor: Record<string, string>;
}) {
  const statusBadge =
    (statusColor[tournament.status] as
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | undefined) || "secondary";
  const typeBadge =
    (typeColor[tournament.type] as
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | undefined) || "outline";

  return (
    <Card className="h-full border-border/60 hover:border-primary/50 transition">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            {new Date(tournament.startDate).toLocaleDateString()} •{" "}
            {tournament.location || "Lieu à définir"}
          </div>
          <div className="flex gap-2">
            <Badge variant={typeBadge}>
              {
                tournamentTypeTranslation[
                  tournament.type as keyof typeof tournamentTypeTranslation
                ]
              }
            </Badge>
            <Badge variant={statusBadge}>
              {tournamentStatusTranslation[tournament.status]}
            </Badge>
          </div>
        </div>
        <Link
          href={`/tournaments/${tournament.id}`}
          className="block text-lg font-semibold hover:text-primary transition line-clamp-2"
        >
          {tournament.name}
        </Link>
        {tournament.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {tournament.description}
          </p>
        )}
        <Button
          asChild
          size="sm"
          variant="secondary"
          className="w-full"
        >
          <Link href={`/tournaments/${tournament.id}`}>Voir les détails</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ResultCard({
  tournament,
  tournamentStatusTranslation,
}: {
  tournament: Tournament;
  tournamentStatusTranslation: Record<string, string>;
}) {
  const podium = (tournament.rankings || [])
    .filter((r) => r.rank <= 3)
    .sort((a, b) => a.rank - b.rank);

  return (
    <Card className="h-full border-border/60 bg-card/80">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{new Date(tournament.endDate).toLocaleDateString()}</span>
          <span>{tournamentStatusTranslation[tournament.status]}</span>
        </div>
        <Link
          href={`/tournaments/${tournament.id}`}
          className="block text-lg font-semibold hover:text-primary transition line-clamp-2"
        >
          {tournament.name}
        </Link>
        {podium.length ? (
          <div className="space-y-2">
            {podium.map((placement) => (
              <div
                key={placement.id}
                className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm"
              >
                <span className="font-medium">#{placement.rank}</span>
                <span className="truncate text-right">
                  {placement.player?.name ||
                    placement.player?.user?.firstName ||
                    "Joueur inconnu"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Classement en attente de publication.
          </p>
        )}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Link href={`/tournaments/${tournament.id}`}>
            Consulter le récapitulatif
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Skeleton
          key={i}
          className="h-40 w-full rounded-xl"
        />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-10 text-center text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}
