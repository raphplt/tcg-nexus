"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { PaginatedNav } from "@/components/Shared/PaginatedNav";
import { H1, H2 } from "@/components/Shared/Titles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { tournamentService } from "@/services/tournament.service";
import type { PaginatedResult } from "@/types/pagination";
import { Tournament } from "@/types/tournament";
import {
  tournamentStatusTranslation,
  tournamentTypeTranslation,
} from "@/utils/tournaments";
import { TournamentsFilters } from "./_components/TournamentsFilters";
import {
  sortOptions,
  statusColor,
  statusOptions,
  typeColor,
  typeOptions,
} from "./utils";

const resolveBadgeVariant = (
  value: string,
  palette: Record<string, string>,
  fallback: "default" | "secondary" | "destructive" | "outline" = "outline",
) =>
  (palette[value] as
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | undefined) || fallback;

const formatDate = (date?: string) => {
  if (!date) return "Date à confirmer";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getTournamentStatusLabel = (status: string) =>
  tournamentStatusTranslation[
    status as keyof typeof tournamentStatusTranslation
  ] || status;

const getTournamentTypeLabel = (type: string) =>
  tournamentTypeTranslation[type as keyof typeof tournamentTypeTranslation] ||
  type;

export default function TournamentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [registeringTournamentId, setRegisteringTournamentId] = useState<
    number | null
  >(null);
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
      limit: 9,
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
    data: upcoming = [],
    isLoading: loadingUpcoming,
    error: upcomingError,
  } = useQuery<Tournament[]>({
    queryKey: ["tournaments", "upcoming", 6],
    queryFn: () =>
      tournamentService.getUpcomingTournaments({
        limit: 6,
      }),
  });

  const {
    data: past = [],
    isLoading: loadingPast,
    error: pastError,
  } = useQuery<Tournament[]>({
    queryKey: ["tournaments", "past", 4],
    queryFn: () => tournamentService.getPastTournaments({ limit: 4 }),
  });

  const spotlightTournament = useMemo(
    () => upcoming[0] || data?.data?.[0] || past[0] || null,
    [data?.data, past, upcoming],
  );

  const browseItems = data?.data ?? [];
  const totalTournaments = data?.meta.totalItems ?? 0;
  const activeCount = browseItems.filter(
    (tournament) => tournament.status === "in_progress",
  ).length;

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

  const handleRegister = async (tournamentId: number) => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!user.player?.id) {
      router.push(`/tournaments/${tournamentId}`);
      return;
    }

    setRegisteringTournamentId(tournamentId);

    try {
      await tournamentService.register(tournamentId, user.player.id, "");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tournaments"] }),
        queryClient.invalidateQueries({
          queryKey: ["tournaments", "upcoming", 6],
        }),
      ]);
      router.push(`/tournaments/${tournamentId}`);
    } catch (registrationError) {
      console.error(
        "Erreur lors de l'inscription au tournoi :",
        registrationError,
      );
    } finally {
      setRegisteringTournamentId(null);
    }
  };

  return (
    <PageWrapper
      maxWidth="xl"
      gradient="none"
      className="tcg-page--tournaments"
    >
      <div className="space-y-8">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
          <div className="tcg-surface tcg-surface--hero tcg-surface--hero-tournaments p-8">
            <div className="space-y-6">
              <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
                Tournois Pokémon
              </Badge>

              <div className="space-y-4">
                <H1 className="max-w-3xl text-4xl font-black leading-tight md:text-5xl">
                  Découvrez les tournois à venir et rejoignez les bonnes tables
                  au bon moment.
                </H1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                  Retrouvez les inscriptions ouvertes, les événements en cours
                  et les accès aux matches depuis un parcours plus direct.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => router.push("/tournaments/create")}
                  disabled={!user?.isPro}
                  className="rounded-full px-6"
                >
                  Créer un tournoi
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-6"
                >
                  <Link href="#listing">
                    Explorer le calendrier
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="rounded-full px-4"
                >
                  <Link href="/play">
                    Aller à Jouer
                    <Swords className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <OverviewMetric
                  label="Tournois référencés"
                  value={String(totalTournaments)}
                  detail="Catalogue total"
                />
                <OverviewMetric
                  label="Ouverts ou imminents"
                  value={String(upcoming.length)}
                  detail="À suivre maintenant"
                />
                <OverviewMetric
                  label="Actifs dans la liste"
                  value={String(activeCount)}
                  detail="Tables en cours"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <QuickNote
                  icon={ShieldCheck}
                  title="Inscriptions ouvertes"
                  text="Repérez rapidement les événements que vous pouvez rejoindre maintenant."
                />
                <QuickNote
                  icon={CalendarClock}
                  title="Calendrier clair"
                  text="Dates, lieux et formats ressortent tout de suite, sans surcharge."
                />
                <QuickNote
                  icon={Swords}
                  title="Accès au match"
                  text="Quand une table est prête, le lien vers la partie reste facile à retrouver."
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="tcg-surface tcg-surface--dark">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                    À la une
                  </span>
                  <Badge className="border-0 bg-white/10 text-white hover:bg-white/10">
                    Focus
                  </Badge>
                </div>

                {spotlightTournament ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">
                        {formatDate(spotlightTournament.startDate)}
                      </p>
                      <h2 className="text-2xl font-bold leading-tight">
                        {spotlightTournament.name}
                      </h2>
                      <p className="text-sm leading-6 text-slate-300">
                        {spotlightTournament.description ||
                          "Le prochain rendez-vous à suivre ou à rejoindre dans la scène tournoi."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={resolveBadgeVariant(
                          spotlightTournament.status,
                          statusColor,
                          "secondary",
                        )}
                      >
                        {getTournamentStatusLabel(spotlightTournament.status)}
                      </Badge>
                      <Badge
                        variant={resolveBadgeVariant(
                          spotlightTournament.type,
                          typeColor,
                        )}
                      >
                        {getTournamentTypeLabel(spotlightTournament.type)}
                      </Badge>
                    </div>

                    <Button
                      asChild
                      variant="secondary"
                      className="w-full rounded-full"
                    >
                      <Link href={`/tournaments/${spotlightTournament.id}`}>
                        Ouvrir la fiche tournoi
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">
                      Aucun tournoi à mettre en avant
                    </p>
                    <p className="text-sm text-slate-300">
                      Crée un nouvel événement ou ouvre les inscriptions pour
                      faire remonter le prochain rendez-vous.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="tcg-surface tcg-surface--soft">
              <CardContent className="grid gap-4 p-6">
                <MiniStat
                  label="Prochaine date"
                  value={
                    spotlightTournament
                      ? formatDate(spotlightTournament.startDate)
                      : "À confirmer"
                  }
                  icon={CalendarClock}
                />
                <MiniStat
                  label="Tournois récents"
                  value={String(past.length)}
                  icon={Trophy}
                />
                <MiniStat
                  label="Recherche rapide"
                  value="Filtres simplifiés"
                  icon={Search}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card className="tcg-surface">
            <CardContent className="space-y-5 p-6">
              <SectionHeading
                eyebrow="En ce moment"
                title="Tournois à ne pas manquer"
                description="Une lecture rapide des événements les plus utiles pour s'inscrire ou suivre le live."
              />

              {loadingUpcoming ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 w-full rounded-2xl" />
                  ))}
                </div>
              ) : upcomingError ? (
                <SoftEmptyState message="Impossible de charger les prochains tournois." />
              ) : upcoming.length ? (
                <div className="space-y-3">
                  {upcoming.slice(0, 4).map((tournament) => (
                    <UpcomingRow key={tournament.id} tournament={tournament} />
                  ))}
                </div>
              ) : (
                <SoftEmptyState message="Aucun tournoi à venir pour le moment." />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="tcg-surface">
              <CardContent className="space-y-5 p-6">
                <SectionHeading
                  eyebrow="Récap"
                  title="Derniers résultats"
                  description="Les derniers tournois terminés, sans la lourdeur d'une grosse table."
                />

                {loadingPast ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton
                        key={index}
                        className="h-20 w-full rounded-2xl"
                      />
                    ))}
                  </div>
                ) : pastError ? (
                  <SoftEmptyState message="Impossible de charger les résultats récents." />
                ) : past.length ? (
                  <div className="space-y-3">
                    {past.slice(0, 3).map((tournament) => (
                      <ResultRow key={tournament.id} tournament={tournament} />
                    ))}
                  </div>
                ) : (
                  <SoftEmptyState message="Pas encore de résultats à afficher." />
                )}
              </CardContent>
            </Card>

            <Card className="tcg-surface tcg-surface--highlight">
              <CardContent className="space-y-4 p-6">
                <Badge className="w-fit rounded-full border-0 bg-primary/10 text-primary hover:bg-primary/10">
                  Jeu en ligne
                </Badge>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold leading-tight">
                    Retrouvez vos parties au même endroit.
                  </h3>
                  <p className="text-sm leading-6 text-slate-600">
                    La page `Jouer` rassemble les matches attribués au joueur et
                    l’accès direct au plateau en ligne.
                  </p>
                </div>
                <Button asChild className="rounded-full">
                  <Link href="/play">
                    Ouvrir le hub de jeu
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="listing" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Annuaire"
              title="Explorer les tournois"
              description="Recherchez par nom, statut ou lieu pour trouver rapidement le bon événement."
            />
            <Badge className="rounded-full border-0 bg-slate-900 text-white hover:bg-slate-900">
              {totalTournaments} tournois
            </Badge>
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

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-72 w-full rounded-3xl" />
              ))}
            </div>
          ) : error ? (
            <Card className="tcg-surface border-destructive/40">
              <CardContent className="p-8 text-sm text-destructive">
                Erreur lors du chargement des tournois.
              </CardContent>
            </Card>
          ) : browseItems.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {browseItems.map((tournament) => (
                <TournamentBrowseCard
                  key={tournament.id}
                  tournament={tournament}
                  onRegister={() => handleRegister(tournament.id)}
                  isRegistering={registeringTournamentId === tournament.id}
                  canRegister={
                    Boolean(user?.player?.id) &&
                    tournament.status === "registration_open"
                  }
                />
              ))}
            </div>
          ) : (
            <Card className="tcg-surface">
              <CardContent className="space-y-3 p-8 text-center">
                <p className="text-lg font-semibold">
                  Aucun tournoi sur ce filtre.
                </p>
                <p className="text-sm text-muted-foreground">
                  Élargissez la recherche ou réinitialisez les filtres pour
                  retrouver les événements disponibles.
                </p>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={resetFilters}
                >
                  Réinitialiser les filtres
                </Button>
              </CardContent>
            </Card>
          )}

          {data && (
            <PaginatedNav meta={data.meta} page={page} onPageChange={setPage} />
          )}
        </section>
      </div>
    </PageWrapper>
  );
}

function OverviewMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="tcg-metric-card p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function QuickNote({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="tcg-note-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="tcg-note-card flex items-center gap-4 p-4">
      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
        <p className="text-base font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
        {eyebrow}
      </p>
      <div className="space-y-1">
        <H2 className="text-2xl font-black">{title}</H2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      </div>
    </div>
  );
}

function UpcomingRow({ tournament }: { tournament: Tournament }) {
  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="tcg-surface tcg-surface--hover group flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-24 rounded-2xl bg-slate-950 px-3 py-2 text-center text-slate-50">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Date
          </p>
          <p className="mt-1 text-sm font-semibold">
            {formatDate(tournament.startDate)}
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-950">
            {tournament.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4 text-primary" />
              {tournament.location || "Lieu à confirmer"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users2 className="h-4 w-4 text-primary" />
              {getTournamentTypeLabel(tournament.type)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          variant={resolveBadgeVariant(
            tournament.status,
            statusColor,
            "secondary",
          )}
        >
          {getTournamentStatusLabel(tournament.status)}
        </Badge>
        <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-950" />
      </div>
    </Link>
  );
}

function ResultRow({ tournament }: { tournament: Tournament }) {
  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="tcg-surface tcg-surface--hover group flex items-center justify-between px-4 py-4"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {formatDate(tournament.endDate || tournament.startDate)}
        </p>
        <p className="mt-1 font-semibold text-slate-950">{tournament.name}</p>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          variant={resolveBadgeVariant(
            tournament.status,
            statusColor,
            "secondary",
          )}
        >
          {getTournamentStatusLabel(tournament.status)}
        </Badge>
        <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-950" />
      </div>
    </Link>
  );
}

function TournamentBrowseCard({
  tournament,
  onRegister,
  isRegistering,
  canRegister,
}: {
  tournament: Tournament;
  onRegister: () => void;
  isRegistering: boolean;
  canRegister: boolean;
}) {
  return (
    <Card className="tcg-surface tcg-surface--hover">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {formatDate(tournament.startDate)}
            </p>
            <h3 className="mt-2 text-xl font-bold leading-tight text-slate-950">
              {tournament.name}
            </h3>
          </div>
          <Badge
            variant={resolveBadgeVariant(
              tournament.status,
              statusColor,
              "secondary",
            )}
          >
            {getTournamentStatusLabel(tournament.status)}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={resolveBadgeVariant(tournament.type, typeColor)}>
            {getTournamentTypeLabel(tournament.type)}
          </Badge>
          <Badge variant="outline">
            {tournament.location || "Lieu à confirmer"}
          </Badge>
        </div>

        <p className="min-h-16 text-sm leading-6 text-slate-600">
          {tournament.description ||
            "Toutes les informations essentielles du tournoi, de l'inscription jusqu'aux matches en ligne."}
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full">
            <Link href={`/tournaments/${tournament.id}`}>
              Voir le tournoi
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={onRegister}
            disabled={!canRegister || isRegistering}
          >
            {isRegistering ? "Inscription..." : "S'inscrire"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SoftEmptyState({ message }: { message: string }) {
  return (
    <div className="tcg-empty-state px-5 py-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
