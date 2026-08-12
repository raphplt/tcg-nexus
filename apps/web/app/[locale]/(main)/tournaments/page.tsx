"use client";

import { useLocale, useTranslations } from "next-intl";
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
import { Link, useRouter } from "@/i18n/navigation";
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

const formatDate = (date: string | undefined, locale: string) => {
  const t = useTranslations("Tournaments");
  if (!date) return t("dateToBeConfirmed");
  return new Date(date).toLocaleDateString(locale, {
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
  const t = useTranslations("Tournaments");
  const locale = useLocale();
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
      await tournamentService.register(tournamentId, "");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tournaments"] }),
        queryClient.invalidateQueries({
          queryKey: ["tournaments", "upcoming", 6],
        }),
      ]);
      router.push(`/tournaments/${tournamentId}`);
    } catch (registrationError) {
      console.error(t("registerError"), registrationError);
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
                {t("hero.title")}
              </Badge>

              <div className="space-y-4">
                <H1 className="max-w-3xl text-4xl font-black leading-tight md:text-5xl">
                  {t("hero.subtitle")}
                </H1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                  {t("hero.description")}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => router.push("/tournaments/create")}
                  disabled={!user?.isPro}
                >
                  {t("hero.create")}
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#listing">
                    {t("hero.browseCalendar")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/play">
                    {t("hero.goToPlay")}
                    <Swords className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <OverviewMetric
                  label={t("stats.listed")}
                  value={String(totalTournaments)}
                  detail="Catalogue total"
                />
                <OverviewMetric
                  label={t("stats.openOrSoon")}
                  value={String(upcoming.length)}
                  detail={t("stats.followNow")}
                />
                <OverviewMetric
                  label={t("stats.activeInList")}
                  value={String(activeCount)}
                  detail="Tables en cours"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <QuickNote
                  icon={ShieldCheck}
                  title="Inscriptions ouvertes"
                  text={t("highlights.joinNow")}
                />
                <QuickNote
                  icon={CalendarClock}
                  title="Calendrier clair"
                  text={t("highlights.clearInfo")}
                />
                <QuickNote
                  icon={Swords}
                  title="Accès au match"
                  text={t("highlights.easyAccess")}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="tcg-surface tcg-surface--dark">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {t("spotlight.title")}
                  </span>
                  <Badge className="border-0 bg-white/10 text-white hover:bg-white/10">
                    Focus
                  </Badge>
                </div>

                {spotlightTournament ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(spotlightTournament.startDate, locale)}
                      </p>
                      <h2 className="text-2xl font-bold leading-tight">
                        {spotlightTournament.name}
                      </h2>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {spotlightTournament.description ||
                          t("spotlight.subtitle")}
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

                    <Button asChild variant="secondary" className="w-full">
                      <Link href={`/tournaments/${spotlightTournament.id}`}>
                        {t("spotlight.open")}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">
                      {t("spotlight.emptyTitle")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("spotlight.emptyDescription")}
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
                      ? formatDate(spotlightTournament.startDate, locale)
                      : t("toBeConfirmed")
                  }
                  icon={CalendarClock}
                />
                <MiniStat
                  label={t("recent.title")}
                  value={String(past.length)}
                  icon={Trophy}
                />
                <MiniStat
                  label="Recherche rapide"
                  value={t("filters.title")}
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
                eyebrow={t("upcoming.title")}
                title="Tournois à ne pas manquer"
                description={t("upcoming.subtitle")}
              />

              {loadingUpcoming ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 w-full" />
                  ))}
                </div>
              ) : upcomingError ? (
                <SoftEmptyState message={t("upcoming.error")} />
              ) : upcoming.length ? (
                <div className="space-y-3">
                  {upcoming.slice(0, 4).map((tournament) => (
                    <UpcomingRow key={tournament.id} tournament={tournament} />
                  ))}
                </div>
              ) : (
                <SoftEmptyState message={t("upcoming.empty")} />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="tcg-surface">
              <CardContent className="space-y-5 p-6">
                <SectionHeading
                  eyebrow={t("results.title")}
                  title="Derniers résultats"
                  description={t("results.subtitle")}
                />

                {loadingPast ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-20 w-full" />
                    ))}
                  </div>
                ) : pastError ? (
                  <SoftEmptyState message={t("results.error")} />
                ) : past.length ? (
                  <div className="space-y-3">
                    {past.slice(0, 3).map((tournament) => (
                      <ResultRow key={tournament.id} tournament={tournament} />
                    ))}
                  </div>
                ) : (
                  <SoftEmptyState message={t("results.empty")} />
                )}
              </CardContent>
            </Card>

            <Card className="tcg-surface tcg-surface--highlight">
              <CardContent className="space-y-4 p-6">
                <Badge className="w-fit border-0 bg-primary/10 text-primary hover:bg-primary/10">
                  Jeu en ligne
                </Badge>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold leading-tight">
                    {t("play.title")}
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {t("play.description")}
                  </p>
                </div>
                <Button asChild>
                  <Link href="/play">
                    {t("play.open")}
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
              description={t("filters.searchHelp")}
            />
            <Badge className="border-0 bg-foreground text-background hover:bg-foreground">
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
                <Skeleton key={index} className="h-72 w-full" />
              ))}
            </div>
          ) : error ? (
            <Card className="tcg-surface border-destructive/40">
              <CardContent className="p-8 text-sm text-destructive">
                {t("list.error")}
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
                <p className="text-lg font-semibold">{t("list.emptyTitle")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("list.emptyDescription")}
                </p>
                <Button variant="outline" onClick={resetFilters}>
                  {t("list.resetFilters")}
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
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
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
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
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
      <div className="rounded-md bg-primary/10 p-3 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-base font-semibold text-foreground">{value}</p>
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
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function UpcomingRow({ tournament }: { tournament: Tournament }) {
  const t = useTranslations("Tournaments");
  const locale = useLocale();
  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="tcg-surface tcg-surface--hover group flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-24 rounded-md bg-foreground px-3 py-2 text-center text-background">
          <p className="text-xs uppercase tracking-[0.18em] opacity-70">
            {t("date")}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {formatDate(tournament.startDate, locale)}
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {tournament.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4 text-primary" />
              {tournament.location || t("locationToBeConfirmed")}
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
        <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
      </div>
    </Link>
  );
}

function ResultRow({ tournament }: { tournament: Tournament }) {
  const locale = useLocale();
  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="tcg-surface tcg-surface--hover group flex items-center justify-between px-4 py-4"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {formatDate(tournament.endDate || tournament.startDate, locale)}
        </p>
        <p className="mt-1 font-semibold text-foreground">{tournament.name}</p>
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
        <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
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
  const t = useTranslations("Tournaments");
  const locale = useLocale();
  return (
    <Card className="tcg-surface tcg-surface--hover">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {formatDate(tournament.startDate, locale)}
            </p>
            <h3 className="mt-2 text-xl font-bold leading-tight text-foreground">
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
            {tournament.location || t("locationToBeConfirmed")}
          </Badge>
        </div>

        <p className="min-h-16 text-sm leading-6 text-muted-foreground">
          {tournament.description || t("card.description")}
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/tournaments/${tournament.id}`}>
              {t("card.view")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
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
    <div className="tcg-empty-state px-5 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
