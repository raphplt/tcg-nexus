"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Crown,
  Equal,
  Medal,
  Trophy,
  User as UserIcon,
} from "lucide-react";
import React, { useState } from "react";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H1 } from "@/components/Shared/Titles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  GlobalRankingPlayer,
  GlobalRankingResponse,
  rankingService,
} from "@/services/ranking.service";

const PERIODS = [
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "all-time", label: "All-time" },
] as const;

const LIMIT = 20;

function TendencyIcon({ tendency }: { tendency: "up" | "down" | "equal" }) {
  if (tendency === "up")
    return <ArrowUp className="h-4 w-4 text-emerald-500" />;
  if (tendency === "down")
    return <ArrowDown className="h-4 w-4 text-red-500" />;
  return <Equal className="h-4 w-4 text-muted-foreground" />;
}

function TendencyBadge({ tendency }: { tendency: "up" | "down" | "equal" }) {
  const variants = {
    up: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    down: "border-red-500/30 bg-red-500/10 text-red-500",
    equal: "border-muted bg-muted/50 text-muted-foreground",
  };
  const labels = { up: "En hausse", down: "En baisse", equal: "Stable" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${variants[tendency]}`}
    >
      <TendencyIcon tendency={tendency} />
      {labels[tendency]}
    </span>
  );
}

function PodiumCard({
  player,
  position,
}: {
  player: GlobalRankingPlayer;
  position: 1 | 2 | 3;
}) {
  const styles = {
    1: {
      border: "border-yellow-400/60",
      bg: "bg-gradient-to-br from-yellow-400/10 via-amber-400/5 to-transparent",
      icon: <Crown className="h-8 w-8 text-yellow-400" />,
      ring: "ring-2 ring-yellow-400/40",
      size: "md:scale-110 md:z-10",
      avatarSize: "h-20 w-20",
      label: "1er",
    },
    2: {
      border: "border-slate-300/50",
      bg: "bg-gradient-to-br from-slate-300/10 via-slate-400/5 to-transparent",
      icon: <Medal className="h-6 w-6 text-slate-300" />,
      ring: "ring-1 ring-slate-300/30",
      size: "",
      avatarSize: "h-16 w-16",
      label: "2e",
    },
    3: {
      border: "border-amber-600/40",
      bg: "bg-gradient-to-br from-amber-600/10 via-amber-700/5 to-transparent",
      icon: <Trophy className="h-6 w-6 text-amber-600" />,
      ring: "ring-1 ring-amber-600/30",
      size: "",
      avatarSize: "h-16 w-16",
      label: "3e",
    },
  };

  const s = styles[position];

  return (
    <Card
      className={`tcg-surface relative overflow-hidden border ${s.border} ${s.bg} ${s.size} transition-transform`}
    >
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="absolute right-3 top-3 opacity-60">{s.icon}</div>
        <Avatar className={`${s.avatarSize} ${s.ring}`}>
          <AvatarImage src={player.avatarUrl || undefined} alt={player.pseudo} />
          <AvatarFallback className="text-lg font-bold">
            {player.pseudo.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-lg font-bold leading-tight">{player.pseudo}</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-primary">
            {player.score}
          </p>
        </div>
        <TendencyBadge tendency={player.tendency} />
        <Badge
          variant="outline"
          className="pointer-events-none border-foreground/20 text-xs"
        >
          {s.label}
        </Badge>
      </CardContent>
    </Card>
  );
}

function RankingRow({
  player,
  isCurrentUser,
}: {
  player: GlobalRankingPlayer;
  isCurrentUser: boolean;
}) {
  return (
    <div
      className={`group flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors ${
        isCurrentUser
          ? "border-primary/40 bg-primary/5 shadow-sm shadow-primary/10"
          : "border-transparent hover:border-border hover:bg-muted/40"
      }`}
    >
      {/* Rank */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted font-bold tabular-nums text-muted-foreground">
        {player.rank}
      </div>

      {/* Avatar + Name */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage
            src={player.avatarUrl || undefined}
            alt={player.pseudo}
          />
          <AvatarFallback className="text-sm font-semibold">
            {player.pseudo.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <p className="truncate font-semibold">
          {player.pseudo}
          {isCurrentUser && (
            <span className="ml-2 text-xs font-medium text-primary">(vous)</span>
          )}
        </p>
      </div>

      {/* Score */}
      <p className="shrink-0 text-lg font-black tabular-nums">{player.score}</p>

      {/* Tendency */}
      <div className="hidden shrink-0 sm:block">
        <TendencyBadge tendency={player.tendency} />
      </div>
      <div className="block shrink-0 sm:hidden">
        <TendencyIcon tendency={player.tendency} />
      </div>
    </div>
  );
}

function StickyUserRow({ player }: { player: GlobalRankingPlayer }) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-primary/30 bg-background/95 px-2 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-4 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 shadow-lg shadow-primary/5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 font-bold tabular-nums text-primary">
          {player.rank}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/30">
            <AvatarImage
              src={player.avatarUrl || undefined}
              alt={player.pseudo}
            />
            <AvatarFallback className="text-sm font-semibold">
              {player.pseudo.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="truncate font-semibold">
              {player.pseudo}
              <span className="ml-2 text-xs font-medium text-primary">
                (vous)
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Votre position</p>
          </div>
        </div>
        <p className="shrink-0 text-lg font-black tabular-nums text-primary">
          {player.score}
        </p>
        <TendencyBadge tendency={player.tendency} />
      </div>
    </div>
  );
}

export default function RankingPage() {
  const { user, isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<string>("all-time");

  const {
    data: ranking,
    isLoading,
    error,
  } = useQuery<GlobalRankingResponse>({
    queryKey: ["ranking", "global", page, period],
    queryFn: () =>
      rankingService.getGlobalRanking({ page, limit: LIMIT, period }),
  });

  const { data: myPosition } = useQuery<GlobalRankingPlayer>({
    queryKey: ["ranking", "me", period],
    queryFn: () => rankingService.getMyRankingPosition({ period }),
    enabled: isAuthenticated,
  });

  const players = ranking?.data ?? [];
  const total = ranking?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const isFirstPage = page === 1;
  const top3 = isFirstPage ? players.slice(0, 3) : [];
  const tableRows = isFirstPage ? players.slice(3) : players;

  // Check if current user is visible in the current page
  const isUserVisibleInPage = players.some((p) => p.userId === user?.id);

  return (
    <PageWrapper maxWidth="xl" gradient="none" className="tcg-page--ranking">
      <div className="space-y-8">
        {/* Header */}
        <section className="tcg-surface tcg-surface--hero p-8">
          <div className="space-y-6">
            <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
              <Medal className="mr-1.5 h-3.5 w-3.5" />
              Classement ELO
            </Badge>

            <div className="space-y-4">
              <H1 className="max-w-3xl text-4xl font-black leading-tight md:text-5xl">
                Classement global des joueurs
              </H1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Retrouvez les meilleurs joueurs de la communauté. Le score ELO
                est mis à jour après chaque match classé et chaque tournoi
                terminé.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                {PERIODS.map((p) => (
                  <Button
                    key={p.value}
                    size="sm"
                    variant={period === p.value ? "default" : "outline"}
                    onClick={() => {
                      setPeriod(p.value);
                      setPage(1);
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Format :</span>
                <select 
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onChange={(e) => {
                    // Logic to handle format change can be added here
                    // setFormat(e.target.value);
                    setPage(1);
                  }}
                  defaultValue="standard"
                >
                  <option value="all">Tous les formats</option>
                  <option value="standard">Standard</option>
                  <option value="expanded">Étendu</option>
                  <option value="glc">Gym Leader Challenge</option>
                </select>
              </div>
            </div>

            {/* Current user summary */}
            {myPosition && (
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-primary">
                    Votre position
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-primary/30 text-lg font-bold"
                >
                  #{myPosition.rank}
                </Badge>
                <span className="text-lg font-black tabular-nums">
                  {myPosition.score} ELO
                </span>
                <TendencyBadge tendency={myPosition.tendency} />
              </div>
            )}
          </div>
        </section>

        {/* Podium - page 1 only */}
        {isFirstPage && !isLoading && top3.length === 3 && (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
            <PodiumCard player={top3[1]!} position={2} />
            <PodiumCard player={top3[0]!} position={1} />
            <PodiumCard player={top3[2]!} position={3} />
          </section>
        )}

        {/* Table */}
        <section className="relative">
          <Card className="tcg-surface overflow-hidden">
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="flex items-center gap-4 border-b px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <div className="w-9 text-center">#</div>
                <div className="flex-1">Joueur</div>
                <div className="w-16 text-right">ELO</div>
                <div className="hidden w-24 text-right sm:block">Tendance</div>
                <div className="block w-6 sm:hidden" />
              </div>

              {/* Rows */}
              {isLoading ? (
                <div className="space-y-1 p-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : error ? (
                <div className="p-8 text-center text-sm text-destructive">
                  Erreur lors du chargement du classement.
                </div>
              ) : tableRows.length === 0 && top3.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Aucun joueur classé pour le moment.
                </div>
              ) : (
                <div className="space-y-0.5 p-2">
                  {tableRows.map((player) => (
                    <RankingRow
                      key={player.userId}
                      player={player}
                      isCurrentUser={player.userId === user?.id}
                    />
                  ))}
                </div>
              )}

              {/* Sticky user row when not visible */}
              {myPosition && !isUserVisibleInPage && (
                <StickyUserRow player={myPosition} />
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }).map(
                  (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (page <= 4) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = page - 3 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        size="sm"
                        variant={page === pageNum ? "default" : "ghost"}
                        className="h-8 w-8 p-0 tabular-nums"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  },
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
