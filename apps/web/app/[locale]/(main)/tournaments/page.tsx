"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleDot,
  MapPin,
  Plus,
  Swords,
  Trophy,
  Users2,
} from "lucide-react";
import React, { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { PaginatedNav } from "@/components/Shared/PaginatedNav";
import { H1, H2 } from "@/components/Shared/Titles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { Link, useRouter } from "@/i18n/navigation";
import { tournamentService } from "@/services/tournament.service";
import type { PaginatedResult } from "@/types/pagination";
import type { Tournament } from "@/types/tournament";
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

/**
 * Provides a date formatter bound to the active locale.
 *
 * @returns A formatter for tournament dates.
 */
const useFormatDate = () => {
  const t = useTranslations("Tournaments");
  const locale = useLocale();

  return useCallback(
    (date: string | undefined) => {
      if (!date) return t("dateToBeConfirmed");
      return new Date(date).toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
    [locale, t],
  );
};

const getTournamentStatusLabel = (status: string) =>
  tournamentStatusTranslation[
    status as keyof typeof tournamentStatusTranslation
  ] || status;

const getTournamentTypeLabel = (type: string) =>
  tournamentTypeTranslation[type as keyof typeof tournamentTypeTranslation] ||
  type;

/**
 * Displays a streamlined tournament discovery experience with immediate
 * search, filtering and registration actions.
 *
 * @returns The tournament discovery page.
 */
export default function TournamentsPage() {
  const t = useTranslations("Tournaments");
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
    queryFn: () => tournamentService.getUpcomingTournaments({ limit: 6 }),
  });

  const {
    data: past = [],
    isLoading: loadingPast,
    error: pastError,
  } = useQuery<Tournament[]>({
    queryKey: ["tournaments", "past", 4],
    queryFn: () => tournamentService.getPastTournaments({ limit: 4 }),
  });

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

    setRegisteringTournamentId(tournamentId);

    try {
      await tournamentService.register(tournamentId, "");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tournaments"] }),
        queryClient.invalidateQueries({
          queryKey: ["tournaments", "upcoming", 6],
        }),
      ]);
      toast.success(t("registerSuccess"));
      router.push(`/tournaments/${tournamentId}`);
    } catch (registrationError: any) {
      toast.error(
        registrationError?.response?.data?.message || t("registerError"),
      );
    } finally {
      setRegisteringTournamentId(null);
    }
  };

  return (
    <PageWrapper
      maxWidth="xl"
      gradient="none"
      className="tcg-page--tournaments !py-5 md:!py-6"
    >
      <div className="space-y-6">
        <header className="tournament-command-header">
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Trophy className="h-4 w-4" />
                {t("hero.title")}
              </div>
              <H1 className="text-3xl font-black leading-tight md:text-4xl">
                {t("hero.compactTitle")}
              </H1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                {t("hero.compactDescription")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/play">
                  <Swords className="h-4 w-4" />
                  {t("hero.goToPlay")}
                </Link>
              </Button>
              {user?.isPro && (
                <Button asChild>
                  <Link href="/tournaments/create">
                    <Plus className="h-4 w-4" />
                    {t("hero.create")}
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="relative z-10 mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/70 pt-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{totalTournaments}</strong>{" "}
              {t("overview.available")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CircleDot className="h-3.5 w-3.5 text-emerald-500" />
              <strong className="text-foreground">{upcoming.length}</strong>{" "}
              {t("overview.upcoming")}
            </span>
            <span>
              <strong className="text-foreground">{activeCount}</strong>{" "}
              {t("overview.live")}
            </span>
          </div>
        </header>

        <section id="listing" className="space-y-4">
          <TournamentsFilters
            filters={filters}
            setFilters={(newFilters) => {
              setFilters((previous) => ({ ...previous, ...newFilters }));
              setPage(1);
            }}
            typeOptions={typeOptions}
            statusOptions={statusOptions}
            sortOptions={sortOptions}
            resetFilters={resetFilters}
          />

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <H2 className="text-2xl font-black">{t("list.title")}</H2>
              <p className="mt-1 text-sm text-muted-foreground">
                {filters.search || filters.status || filters.type
                  ? t("list.filteredDescription")
                  : t("list.description")}
              </p>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {t("list.count", { count: totalTournaments })}
            </Badge>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-72 w-full rounded-xl" />
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
                />
              ))}
            </div>
          ) : (
            <Card className="tcg-surface">
              <CardContent className="space-y-3 p-10 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CalendarDays className="h-5 w-5" />
                </div>
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

        <section className="grid gap-4 border-t border-border pt-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="tcg-surface">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">{t("upcoming.title")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("upcoming.compactSubtitle")}
                  </p>
                </div>
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>

              {loadingUpcoming ? (
                <Skeleton className="h-20 w-full" />
              ) : upcomingError ? (
                <SoftEmptyState message={t("upcoming.error")} />
              ) : upcoming.length ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {upcoming.slice(0, 4).map((tournament) => (
                    <CompactTournamentRow
                      key={tournament.id}
                      tournament={tournament}
                    />
                  ))}
                </div>
              ) : (
                <SoftEmptyState message={t("upcoming.empty")} />
              )}
            </CardContent>
          </Card>

          <Card className="tournament-play-card text-white">
            <CardContent className="relative z-10 flex h-full flex-col justify-between gap-5 p-5">
              <div>
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <Swords className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold">{t("play.compactTitle")}</h2>
                <p className="mt-1 text-sm leading-6 text-white/65">
                  {t("play.compactDescription")}
                </p>
              </div>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/play">
                  {t("play.open")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {!loadingPast && !pastError && past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t("results.title")}
            </h2>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {past.map((tournament) => (
                <CompactTournamentRow
                  key={tournament.id}
                  tournament={tournament}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageWrapper>
  );
}

function TournamentBrowseCard({
  tournament,
  onRegister,
  isRegistering,
}: {
  tournament: Tournament;
  onRegister: () => void;
  isRegistering: boolean;
}) {
  const t = useTranslations("Tournaments");
  const { user } = useAuth();
  const formatDate = useFormatDate();
  const canRegister = tournament.status === "registration_open";
  const playerCount = tournament.players?.length ?? 0;

  return (
    <Card className="tournament-card group overflow-hidden">
      <CardContent className="flex h-full flex-col p-0">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/45 to-secondary" />
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="tournament-date-tile">
              <CalendarDays className="h-4 w-4" />
              <span>{formatDate(tournament.startDate)}</span>
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

          <Link href={`/tournaments/${tournament.id}`} className="mt-4 block">
            <h3 className="line-clamp-2 text-xl font-bold leading-snug transition-colors group-hover:text-primary">
              {tournament.name}
            </h3>
          </Link>

          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">
                {tournament.location || t("locationToBeConfirmed")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 shrink-0 text-primary" />
              <span>{getTournamentTypeLabel(tournament.type)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 shrink-0 text-primary" />
              <span>
                {t("card.players", {
                  count: playerCount,
                  max: tournament.maxPlayers ?? "—",
                })}
              </span>
            </div>
          </div>

          <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
            {tournament.description || t("card.description")}
          </p>

          <div className="mt-auto flex gap-2 pt-5">
            <Button asChild className="flex-1">
              <Link href={`/tournaments/${tournament.id}`}>
                {t("card.view")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            {canRegister && (
              <Button
                variant="outline"
                onClick={onRegister}
                disabled={isRegistering}
                aria-label={t("card.registerFor", { name: tournament.name })}
              >
                {isRegistering
                  ? t("card.registering")
                  : user
                    ? t("card.register")
                    : t("card.loginToRegister")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactTournamentRow({ tournament }: { tournament: Tournament }) {
  const formatDate = useFormatDate();

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="group flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background p-3 transition hover:border-primary/35 hover:bg-accent/50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <CalendarDays className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold group-hover:text-primary">
          {tournament.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDate(tournament.startDate)} ·{" "}
          {getTournamentStatusLabel(tournament.status)}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function SoftEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-5 py-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
