"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  Clock3,
  Gamepad2,
  Layers3,
  Loader2,
  Search,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { casualMatchService } from "@/services/casual-match.service";
import { matchService } from "@/services/match.service";
import { trainingMatchService } from "@/services/training-match.service";
import type {
  CasualLobbyView,
  CasualSessionSummary,
} from "@/types/casual-match";
import { PlayHubMatchSummary, PlayHubResponse } from "@/types/play-hub";
import type {
  TrainingDifficulty,
  TrainingLobbyView,
  TrainingSessionSummary,
} from "@/types/training-match";
import { extractApiErrorMessage } from "@/utils/api-error";
import { API_BASE_URL } from "@/utils/fetch";

type MatchBucket = "all" | "live" | "ready" | "done";
type PlayTab = "tournois" | "ia" | "duel";
type MatchmakingStatus = "idle" | "queued" | "matched";
type ResumeKind =
  | "tournament_live"
  | "tournament_ready"
  | "training_awaiting"
  | "training_active"
  | "duel_awaiting"
  | "duel_active";

interface PlayerMatchRecord {
  match: PlayHubMatchSummary;
  opponentName: string;
  bucket: Exclude<MatchBucket, "all">;
}

interface ResumeItem {
  kind: ResumeKind;
  priority: number;
  title: string;
  subtitle: string;
  statusLabel: string;
  href: string;
  actionLabel: string;
  updatedAt: string | null;
}

const RESUME_LIMIT = 3;

const phaseLabels: Record<string, string> = {
  qualification: "Qualification",
  quarter_final: "Quart de finale",
  semi_final: "Demi-finale",
  final: "Finale",
};

const statusLabels: Record<PlayHubMatchSummary["status"], string> = {
  scheduled: "Prêt à lancer",
  in_progress: "En cours",
  finished: "Terminé",
  forfeit: "Forfait",
  cancelled: "Annulé",
};

const statusVariants: Record<
  PlayHubMatchSummary["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  scheduled: "secondary",
  in_progress: "default",
  finished: "outline",
  forfeit: "destructive",
  cancelled: "outline",
};

const queueFilters: Array<{ id: MatchBucket; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "live", label: "À reprendre" },
  { id: "ready", label: "Prêts" },
  { id: "done", label: "Historique" },
];

const playTabs: Array<{ id: PlayTab; label: string }> = [
  { id: "tournois", label: "Tournois" },
  { id: "ia", label: "IA" },
  { id: "duel", label: "Duel" },
];

const difficultyLabels: Record<TrainingDifficulty, string> = {
  easy: "Facile",
  standard: "Standard",
};

const isPlayTab = (value: string | null): value is PlayTab =>
  value === "tournois" || value === "ia" || value === "duel";

const formatPlayDate = (date?: string | null, fallback = "Date à confirmer") => {
  if (!date) return fallback;

  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPhase = (phase: string) =>
  phaseLabels[phase] ||
  phase
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getNeutralErrorMessage = (error: unknown, fallback: string) => {
  const message = extractApiErrorMessage(error, fallback).trim();
  const normalized = message.toLowerCase();

  if (
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden") ||
    normalized.includes("unauthenticated") ||
    normalized.includes("non autorisé")
  ) {
    return fallback;
  }

  return message;
};

const getMatchBucket = (
  status: PlayHubMatchSummary["status"],
): PlayerMatchRecord["bucket"] => {
  if (status === "in_progress") return "live";
  if (status === "scheduled") return "ready";
  return "done";
};

const getMatchActionLabel = (status: PlayHubMatchSummary["status"]) =>
  status === "in_progress" ? "Reprendre" : "Ouvrir la table";

const getMatchActivity = (match: PlayHubMatchSummary) => {
  if (match.status === "in_progress") {
    return {
      label: "En cours depuis",
      value: formatPlayDate(match.startedAt, "Partie en direct"),
      updatedAt: match.startedAt || match.scheduledDate || null,
    };
  }

  if (match.status === "scheduled") {
    return {
      label: "Prévu pour",
      value: formatPlayDate(match.scheduledDate, "Table prête à lancer"),
      updatedAt: match.scheduledDate || null,
    };
  }

  return {
    label: "Dernière activité",
    value: formatPlayDate(
      match.finishedAt || match.startedAt || match.scheduledDate,
      "Historique disponible",
    ),
    updatedAt: match.finishedAt || match.startedAt || match.scheduledDate || null,
  };
};

const sortByRecentDate = <T extends { updatedAt?: string | null }>(
  left: T,
  right: T,
) =>
  new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();

const buildResumeItems = (
  playHub?: PlayHubResponse,
  trainingLobby?: TrainingLobbyView,
  casualLobby?: CasualLobbyView,
): ResumeItem[] => {
  const items: ResumeItem[] = [];

  for (const match of playHub?.matches || []) {
    if (match.status !== "in_progress" && match.status !== "scheduled") {
      continue;
    }

    items.push({
      kind: match.status === "in_progress" ? "tournament_live" : "tournament_ready",
      priority: match.status === "in_progress" ? 0 : 1,
      title: `vs ${match.opponentName}`,
      subtitle: `${match.tournamentName} • ${formatPhase(match.phase)} • Round ${match.round}`,
      statusLabel: statusLabels[match.status],
      href: `/tournaments/${match.tournamentId}/matches/${match.id}`,
      actionLabel: getMatchActionLabel(match.status),
      updatedAt:
        match.startedAt || match.scheduledDate || match.finishedAt || null,
    });
  }

  for (const session of trainingLobby?.activeSessions || []) {
    items.push({
      kind: session.awaitingPlayerAction
        ? "training_awaiting"
        : "training_active",
      priority: session.awaitingPlayerAction ? 2 : 3,
      title: session.aiDeckPresetName,
      subtitle: `IA ${difficultyLabels[session.aiDifficulty]} • Tour ${session.turnNumber}`,
      statusLabel: session.awaitingPlayerAction ? "À vous de jouer" : "Session active",
      href: `/play/training/${session.sessionId}`,
      actionLabel: "Continuer",
      updatedAt: session.updatedAt,
    });
  }

  for (const session of casualLobby?.activeSessions || []) {
    items.push({
      kind: session.awaitingPlayerAction ? "duel_awaiting" : "duel_active",
      priority: session.awaitingPlayerAction ? 4 : 5,
      title: `vs ${session.opponentName}`,
      subtitle: `Duel 1v1 • Tour ${session.turnNumber}`,
      statusLabel: session.awaitingPlayerAction ? "À vous" : "Tour adverse",
      href: `/play/casual/${session.sessionId}`,
      actionLabel: "Continuer",
      updatedAt: session.updatedAt,
    });
  }

  return items
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return sortByRecentDate(left, right);
    })
    .slice(0, RESUME_LIMIT);
};

const getDefaultPlayTab = (
  playHub?: PlayHubResponse,
  trainingLobby?: TrainingLobbyView,
  casualLobby?: CasualLobbyView,
): PlayTab => {
  const hasTournamentAction =
    playHub?.matches.some(
      (match) =>
        match.status === "in_progress" || match.status === "scheduled",
    ) || false;

  if (hasTournamentAction) return "tournois";
  if ((trainingLobby?.activeSessions.length || 0) > 0) return "ia";
  if (
    (casualLobby?.activeSessions.length || 0) > 0 ||
    casualLobby?.queueStatus === "queued"
  ) {
    return "duel";
  }

  return "tournois";
};

export default function PlayPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeFilter, setActiveFilter] = useState<MatchBucket>("all");
  const [activeTab, setActiveTab] = useState<PlayTab>("tournois");

  const playHubQuery = useQuery<PlayHubResponse>({
    queryKey: ["play", "hub"],
    queryFn: () => matchService.getPlayHub(),
    enabled: Boolean(isAuthenticated),
  });
  const trainingLobbyQuery = useQuery<TrainingLobbyView>({
    queryKey: ["training-matches", "lobby"],
    queryFn: () => trainingMatchService.getLobby(),
    enabled: Boolean(isAuthenticated),
  });
  const casualLobbyQuery = useQuery<CasualLobbyView>({
    queryKey: ["casual-matches", "lobby"],
    queryFn: () => casualMatchService.getLobby(),
    enabled: Boolean(isAuthenticated),
  });

  const playHub = playHubQuery.data;
  const trainingLobby = trainingLobbyQuery.data;
  const casualLobby = casualLobbyQuery.data;
  const searchParamsString = searchParams.toString();
  const tabParam = new URLSearchParams(searchParamsString).get("tab");
  const requestedTab = isPlayTab(tabParam) ? tabParam : null;
  const matchRecords = useMemo(
    () =>
      (playHub?.matches || []).map((match) => ({
        match,
        opponentName: match.opponentName,
        bucket: getMatchBucket(match.status),
      })),
    [playHub?.matches],
  );
  const liveCount = playHub?.summary.liveMatches || 0;
  const readyCount = playHub?.summary.readyMatches || 0;
  const tournamentActionCount = liveCount + readyCount;
  const trainingSessionsCount = trainingLobby?.activeSessions.length || 0;
  const duelSessionsCount = casualLobby?.activeSessions.length || 0;
  const secondarySessionsCount = trainingSessionsCount + duelSessionsCount;
  const tabCounts: Record<PlayTab, number> = {
    tournois: tournamentActionCount,
    ia: trainingSessionsCount,
    duel:
      duelSessionsCount + (casualLobby?.queueStatus === "queued" ? 1 : 0),
  };
  const filterCounts = useMemo(
    () => ({
      all: matchRecords.length,
      live: matchRecords.filter((record) => record.bucket === "live").length,
      ready: matchRecords.filter((record) => record.bucket === "ready").length,
      done: matchRecords.filter((record) => record.bucket === "done").length,
    }),
    [matchRecords],
  );
  const filteredMatches = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return matchRecords.filter((record) => {
      const matchesFilter =
        activeFilter === "all" ? true : record.bucket === activeFilter;
      const matchesSearch =
        !normalizedSearch ||
        record.match.tournamentName.toLowerCase().includes(normalizedSearch) ||
        record.opponentName.toLowerCase().includes(normalizedSearch) ||
        String(record.match.id).includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, deferredSearch, matchRecords]);
  const groupedMatches = useMemo(
    () => ({
      live: filteredMatches.filter((record) => record.bucket === "live"),
      ready: filteredMatches.filter((record) => record.bucket === "ready"),
      done: filteredMatches.filter((record) => record.bucket === "done"),
    }),
    [filteredMatches],
  );
  const visibleHistoryMatches = useMemo(() => {
    const shouldExpandHistory =
      activeFilter === "done" || deferredSearch.trim().length > 0;

    return shouldExpandHistory
      ? groupedMatches.done
      : groupedMatches.done.slice(0, 4);
  }, [activeFilter, deferredSearch, groupedMatches.done]);
  const resumeItems = useMemo(
    () => buildResumeItems(playHub, trainingLobby, casualLobby),
    [casualLobby, playHub, trainingLobby],
  );
  const defaultTab = useMemo(
    () => getDefaultPlayTab(playHub, trainingLobby, casualLobby),
    [casualLobby, playHub, trainingLobby],
  );

  useEffect(() => {
    if (!isAuthenticated || playHubQuery.isLoading) {
      return;
    }

    const nextTab = requestedTab ?? defaultTab;
    setActiveTab(nextTab);

    if (requestedTab !== nextTab) {
      const params = new URLSearchParams(searchParamsString);
      params.set("tab", nextTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [
    defaultTab,
    isAuthenticated,
    pathname,
    playHubQuery.isLoading,
    requestedTab,
    router,
    searchParamsString,
  ]);

  const handleTabChange = (value: string) => {
    if (!isPlayTab(value)) return;

    setActiveTab(value);

    const params = new URLSearchParams(searchParamsString);
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (isLoading) {
    return <PlayPageSkeleton />;
  }

  if (!isAuthenticated) {
    return <PlayGuestPage />;
  }

  if (
    isAuthenticated &&
    !playHubQuery.isLoading &&
    playHub?.playerId === null
  ) {
    return (
      <PageWrapper maxWidth="xl" gradient="none" className="tcg-page--soft">
        <Card className="tcg-surface tcg-surface--hero tcg-surface--hero-play">
          <CardContent className="space-y-5 p-8">
            <Badge className="w-fit rounded-full border-0 bg-primary/10 text-primary hover:bg-primary/10">
              Profil joueur requis
            </Badge>
            <div className="space-y-3">
              <h1 className="text-3xl font-black leading-tight">
                Votre compte n’est pas encore prêt pour le jeu en ligne.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Il manque encore un profil joueur exploitable pour ouvrir vos
                tables et lancer des parties.
              </p>
            </div>
            <Button asChild className="rounded-full">
              <Link href="/profile">
                Ouvrir mon profil
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  if (playHubQuery.isLoading) {
    return <PlayPageSkeleton />;
  }

  return (
    <PageWrapper maxWidth="xl" gradient="none" className="tcg-page--play">
      <div className="space-y-6">
        <PlayHeader
          tournamentActionCount={tournamentActionCount}
          secondarySessionsCount={secondarySessionsCount}
          deckCount={playHub?.summary.totalDecks || 0}
          secondaryMetricsLoading={
            trainingLobbyQuery.isLoading || casualLobbyQuery.isLoading
          }
        />

        <PlayResumeStrip
          items={resumeItems}
          isLoading={trainingLobbyQuery.isLoading || casualLobbyQuery.isLoading}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-[1.25rem] border border-slate-200/80 bg-slate-100/80 p-1">
            {playTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-[0.95rem] px-4 py-3 text-sm font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm"
              >
                <span>{tab.label}</span>
                {tabCounts[tab.id] > 0 ? (
                  <span className="ml-2 rounded-full bg-slate-900/8 px-2 py-0.5 text-xs text-slate-500">
                    {tabCounts[tab.id]}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="tournois" className="mt-0">
            <PlayTournamentTab
              query={playHubQuery}
              search={search}
              onSearchChange={setSearch}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              filterCounts={filterCounts}
              liveMatches={groupedMatches.live}
              readyMatches={groupedMatches.ready}
              historyMatches={visibleHistoryMatches}
              hasSearch={deferredSearch.trim().length > 0}
              historyIsTrimmed={
                activeFilter !== "done" &&
                deferredSearch.trim().length === 0 &&
                groupedMatches.done.length > visibleHistoryMatches.length
              }
            />
          </TabsContent>

          <TabsContent value="ia" className="mt-0">
            <PlayTrainingTab query={trainingLobbyQuery} />
          </TabsContent>

          <TabsContent value="duel" className="mt-0">
            <PlayDuelTab query={casualLobbyQuery} />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}

function PlayHeader({
  tournamentActionCount,
  secondarySessionsCount,
  deckCount,
  secondaryMetricsLoading,
}: {
  tournamentActionCount: number;
  secondarySessionsCount: number;
  deckCount: number;
  secondaryMetricsLoading: boolean;
}) {
  return (
    <Card className="tcg-surface tcg-surface--hero tcg-surface--hero-play">
      <CardContent className="space-y-6 p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit rounded-full border-0 bg-primary/10 text-primary hover:bg-primary/10">
              Jouer
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-black leading-tight text-slate-950 md:text-4xl">
                Tournois, entraînement et duel
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                Accédez à vos matches de tournoi, à l’entraînement et au duel
                en ligne.
              </p>
            </div>
          </div>

          <Button asChild variant="outline" className="rounded-full">
            <Link href="/decks/me">
              Gérer mes decks
              <Layers3 className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <HeaderMetric
            label="Matches de tournoi"
            value={String(tournamentActionCount)}
            detail="En cours ou prêts"
          />
          <HeaderMetric
            label="Parties en cours"
            value={
              secondaryMetricsLoading ? "..." : String(secondarySessionsCount)
            }
            detail="IA et duel"
          />
          <HeaderMetric
            label="Decks compatibles"
            value={String(deckCount)}
            detail="Disponibles"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function HeaderMetric({
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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function PlayResumeStrip({
  items,
  isLoading,
}: {
  items: ResumeItem[];
  isLoading: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
            En cours
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            À reprendre
          </h2>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Actualisation...
          </div>
        ) : null}
      </div>

      {items.length ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {items.map((item) => (
            <ResumeCard key={`${item.kind}-${item.href}`} item={item} />
          ))}
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : (
        <PlaySoftState message="Aucune partie en cours." />
      )}
    </section>
  );
}

function ResumeCard({ item }: { item: ResumeItem }) {
  return (
    <Card className="tcg-surface tcg-surface--hover" data-testid="resume-item">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-2">
          <Badge className={cn("rounded-full border-0", getResumeBadgeClass(item.kind))}>
            {item.statusLabel}
          </Badge>
          <div className="space-y-1">
            <h3 className="text-xl font-bold leading-tight text-slate-950">
              {item.title}
            </h3>
            <p className="text-sm leading-6 text-slate-600">{item.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock3 className="h-4 w-4 text-slate-400" />
          <span>
            {item.updatedAt
              ? `Dernière activité ${formatPlayDate(item.updatedAt)}`
              : "Mise à jour dès que disponible"}
          </span>
        </div>

        <Button asChild className="w-full rounded-full">
          <Link href={item.href}>
            {item.actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function PlayTournamentTab({
  query,
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  filterCounts,
  liveMatches,
  readyMatches,
  historyMatches,
  hasSearch,
  historyIsTrimmed,
}: {
  query: UseQueryResult<PlayHubResponse>;
  search: string;
  onSearchChange: (value: string) => void;
  activeFilter: MatchBucket;
  onFilterChange: (value: MatchBucket) => void;
  filterCounts: Record<MatchBucket, number>;
  liveMatches: PlayerMatchRecord[];
  readyMatches: PlayerMatchRecord[];
  historyMatches: PlayerMatchRecord[];
  hasSearch: boolean;
  historyIsTrimmed: boolean;
}) {
  const hasMatches =
    liveMatches.length > 0 || readyMatches.length > 0 || historyMatches.length > 0;

  return (
    <Card className="tcg-surface">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
              Matches
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Tournois
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Consultez vos tables en cours, prêtes à lancer ou terminées.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Rechercher un tournoi, un adversaire ou un match"
              className="rounded-full border-slate-200 bg-slate-50 pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {queueFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => onFilterChange(filter.id)}
              className={cn(
                "tcg-filter-chip",
                activeFilter === filter.id && "tcg-filter-chip--active",
              )}
            >
              {filter.label}
              <span className="ml-2 text-xs opacity-70">{filterCounts[filter.id]}</span>
            </button>
          ))}
        </div>

        {query.error && filterCounts.all === 0 ? (
          <PlayErrorState
            message={getNeutralErrorMessage(
              query.error,
              "Impossible de charger les matches de tournoi.",
            )}
            onRetry={() => void query.refetch()}
          />
        ) : !hasMatches ? (
          <PlaySoftState
            message={
              hasSearch || activeFilter !== "all"
                ? "Aucun match ne correspond à la recherche."
                : "Aucun match de tournoi pour le moment."
            }
          />
        ) : (
          <div className="space-y-6">
            {liveMatches.length ? (
              <MatchSection
                title="En cours"
                description="Tables à reprendre."
              >
                {liveMatches.map((record) => (
                  <PlayerMatchCard key={record.match.id} record={record} />
                ))}
              </MatchSection>
            ) : null}

            {readyMatches.length ? (
              <MatchSection
                title="Prêts"
                description="Tables prêtes à lancer."
              >
                {readyMatches.map((record) => (
                  <PlayerMatchCard key={record.match.id} record={record} />
                ))}
              </MatchSection>
            ) : null}

            {historyMatches.length ? (
              <MatchSection
                title="Terminés"
                description={
                  historyIsTrimmed
                    ? "Derniers résultats."
                    : "Matches terminés, annulés ou forfaits."
                }
              >
                {historyMatches.map((record) => (
                  <PlayerMatchCard
                    key={record.match.id}
                    record={record}
                    compact
                  />
                ))}
              </MatchSection>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MatchSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-slate-950">{title}</h3>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function PlayerMatchCard({
  record,
  compact = false,
}: {
  record: PlayerMatchRecord;
  compact?: boolean;
}) {
  const activity = getMatchActivity(record.match);

  return (
    <Card className="tcg-surface tcg-surface--hover">
      <CardContent className={cn("space-y-4", compact ? "p-4" : "p-5")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {record.match.tournamentName}
            </p>
            <div className="space-y-1">
              <h3
                className={cn(
                  "font-bold leading-tight text-slate-950",
                  compact ? "text-lg" : "text-2xl",
                )}
              >
                vs {record.opponentName}
              </h3>
              <p className="text-sm text-slate-600">
                {formatPhase(record.match.phase)} • Round {record.match.round}
              </p>
            </div>
          </div>

          <Badge variant={statusVariants[record.match.status]}>
            {statusLabels[record.match.status]}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
            <span>{record.opponentName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <span>
              {activity.label} {activity.value}
            </span>
          </div>
          {record.match.status !== "finished" ? (
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-primary" />
              <span>
                {record.match.status === "in_progress"
                  ? "Partie à reprendre"
                  : "Choix du deck à l’ouverture"}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full">
            <Link
              href={`/tournaments/${record.match.tournamentId}/matches/${record.match.id}`}
            >
              {getMatchActionLabel(record.match.status)}
              <Swords className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href={`/tournaments/${record.match.tournamentId}`}>
              Voir le tournoi
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlayTrainingTab({
  query,
}: {
  query: UseQueryResult<TrainingLobbyView>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<TrainingDifficulty>("standard");
  const [lastError, setLastError] = useState<string | null>(null);

  const eligibleDecks = useMemo(
    () => (query.data?.availableDecks || []).filter((deck) => deck.eligible),
    [query.data?.availableDecks],
  );
  const blockedDecks = useMemo(
    () => (query.data?.availableDecks || []).filter((deck) => !deck.eligible),
    [query.data?.availableDecks],
  );
  const activeSessions = useMemo(
    () =>
      [...(query.data?.activeSessions || [])].sort((left, right) => {
        if (left.awaitingPlayerAction !== right.awaitingPlayerAction) {
          return left.awaitingPlayerAction ? -1 : 1;
        }

        return sortByRecentDate(left, right);
      }),
    [query.data?.activeSessions],
  );
  const selectedPreset =
    query.data?.aiDeckPresets.find((preset) => preset.id === selectedPresetId) ||
    null;

  useEffect(() => {
    if (!selectedDeckId && eligibleDecks.length > 0 && eligibleDecks[0]) {
      setSelectedDeckId(eligibleDecks[0].deckId);
    }
  }, [eligibleDecks, selectedDeckId]);

  useEffect(() => {
    if (!selectedPresetId && query.data?.aiDeckPresets[0]) {
      setSelectedPresetId(query.data.aiDeckPresets[0].id);
    }
  }, [query.data?.aiDeckPresets, selectedPresetId]);

  useEffect(() => {
    if (
      query.data?.difficulties.length &&
      !query.data.difficulties.includes(selectedDifficulty)
    ) {
      const nextDifficulty = query.data.difficulties[0];
      if (nextDifficulty) {
        setSelectedDifficulty(nextDifficulty);
      }
    }
  }, [query.data?.difficulties, selectedDifficulty]);

  const createSessionMutation = useMutation({
    mutationFn: () => {
      if (!selectedDeckId || !selectedPresetId) {
        throw new Error("Sélection incomplète");
      }

      return trainingMatchService.createSession({
        deckId: selectedDeckId,
        aiDeckPresetId: selectedPresetId,
        difficulty: selectedDifficulty,
      });
    },
    onSuccess: (session) => {
      setLastError(null);
      queryClient.setQueryData(["training-matches", session.sessionId], session);
      void queryClient.invalidateQueries({
        queryKey: ["training-matches", "lobby"],
      });
      router.push(`/play/training/${session.sessionId}`);
    },
    onError: (error: unknown) => {
      setLastError(
        getNeutralErrorMessage(
          error,
          "Impossible de lancer ce match d’entraînement.",
        ),
      );
    },
  });

  if (query.isLoading) {
    return <PlayModeLoadingShell label="Chargement du mode entraînement..." />;
  }

  if (query.error || !query.data) {
    return (
      <PlayErrorState
        message={getNeutralErrorMessage(
          query.error,
          "Impossible de charger le mode entraînement.",
        )}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card className="tcg-surface tcg-surface--highlight">
        <CardContent className="space-y-5 p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="w-fit rounded-full border-0 bg-primary/10 text-primary hover:bg-primary/10">
                IA
              </Badge>
              <Badge variant="secondary">BO1</Badge>
              <Badge variant="outline">Non classé</Badge>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-950">
                Entraînement
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Choisissez un deck, un deck IA et une difficulté.
              </p>
            </div>
          </div>

          {lastError ? <InlineErrorMessage message={lastError} /> : null}

          {eligibleDecks.length ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Deck joueur
                  </p>
                  <Select
                    value={selectedDeckId?.toString() ?? ""}
                    onValueChange={(value) => setSelectedDeckId(Number(value))}
                  >
                    <SelectTrigger className="w-full rounded-2xl bg-white">
                      <SelectValue placeholder="Choisir un deck" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleDecks.map((deck) => (
                        <SelectItem key={deck.deckId} value={String(deck.deckId)}>
                          {deck.deckName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Preset IA
                  </p>
                  <Select
                    value={selectedPresetId}
                    onValueChange={setSelectedPresetId}
                  >
                    <SelectTrigger className="w-full rounded-2xl bg-white">
                      <SelectValue placeholder="Choisir un preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {query.data.aiDeckPresets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Difficulté
                  </p>
                  <Select
                    value={selectedDifficulty}
                    onValueChange={(value) =>
                      setSelectedDifficulty(value as TrainingDifficulty)
                    }
                  >
                    <SelectTrigger className="w-full rounded-2xl bg-white">
                      <SelectValue placeholder="Choisir un niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      {query.data.difficulties.map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficultyLabels[difficulty]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedPreset ? (
                <div className="tcg-note-card flex items-start gap-3 p-4">
                  <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-950">
                      {selectedPreset.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {selectedPreset.cardCount} cartes supportées pour cette
                      session IA.
                    </p>
                  </div>
                </div>
              ) : null}

              <Button
                className="w-full rounded-full"
                disabled={
                  createSessionMutation.isPending ||
                  !selectedDeckId ||
                  !selectedPresetId
                }
                onClick={() => createSessionMutation.mutate()}
              >
                {createSessionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création du match...
                  </>
                ) : (
                <>
                    Lancer la partie
                    <Swords className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <PlaySoftState
              message="Aucun deck compatible pour l’entraînement."
              action={
                <Button asChild className="rounded-full">
                  <Link href="/decks/me">
                    Ouvrir mes decks
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_340px]">
        <Card className="tcg-surface">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Parties en cours
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">
                  Entraînement
                </h3>
              </div>
              <Badge variant="outline">
                {activeSessions.length} ouverte
                {activeSessions.length > 1 ? "s" : ""}
              </Badge>
            </div>

            {activeSessions.length ? (
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <TrainingSessionCard
                    key={session.sessionId}
                    session={session}
                  />
                ))}
              </div>
            ) : (
              <PlaySoftState message="Aucune partie d’entraînement en cours." />
            )}
          </CardContent>
        </Card>

        {blockedDecks.length ? (
          <Card className="tcg-surface">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Decks incompatibles
                </p>
              </div>
              <div className="space-y-3">
                {blockedDecks.slice(0, 3).map((deck) => (
                  <div key={deck.deckId} className="tcg-note-card space-y-2 p-4">
                    <p className="font-semibold text-slate-950">{deck.deckName}</p>
                    <p className="text-sm leading-6 text-slate-500">
                      {deck.reasons[0]?.message || "Deck non supporté."}
                    </p>
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" className="w-full rounded-full">
                <Link href="/decks/me">
                  Corriger mes decks
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function TrainingSessionCard({ session }: { session: TrainingSessionSummary }) {
  return (
    <div className="tcg-note-card space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-slate-950">
            {session.aiDeckPresetName}
          </p>
          <p className="text-sm text-slate-500">
            IA {difficultyLabels[session.aiDifficulty]} • Tour {session.turnNumber}
          </p>
        </div>
        <Badge variant={session.awaitingPlayerAction ? "default" : "secondary"}>
          {session.awaitingPlayerAction ? "À vous de jouer" : "Tour de l’IA"}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>Mise à jour {formatPlayDate(session.updatedAt)}</span>
        <Button asChild variant="outline" className="rounded-full">
          <Link href={`/play/training/${session.sessionId}`}>
            Continuer
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function PlayDuelTab({
  query,
}: {
  query: UseQueryResult<CasualLobbyView>;
}) {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [mmStatus, setMmStatus] = useState<MatchmakingStatus>("idle");
  const [queueSize, setQueueSize] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [matchedSessionId, setMatchedSessionId] = useState<number | null>(null);

  const eligibleDecks = useMemo(
    () => (query.data?.availableDecks || []).filter((deck) => deck.eligible),
    [query.data?.availableDecks],
  );
  const activeSessions = useMemo(
    () =>
      [...(query.data?.activeSessions || [])].sort((left, right) => {
        if (left.awaitingPlayerAction !== right.awaitingPlayerAction) {
          return left.awaitingPlayerAction ? -1 : 1;
        }

        return sortByRecentDate(left, right);
      }),
    [query.data?.activeSessions],
  );
  const socketBaseUrl = useMemo(() => {
    if (API_BASE_URL.startsWith("http")) {
      return API_BASE_URL;
    }

    if (typeof window === "undefined") {
      return "";
    }

    return new URL(API_BASE_URL, window.location.origin).toString();
  }, []);

  useEffect(() => {
    if (!selectedDeckId && eligibleDecks.length > 0 && eligibleDecks[0]) {
      setSelectedDeckId(eligibleDecks[0].deckId);
    }
  }, [eligibleDecks, selectedDeckId]);

  useEffect(() => {
    if (query.data?.queueStatus === "queued" && matchedSessionId === null) {
      setMmStatus("queued");
      return;
    }

    if (query.data?.queueStatus === "idle" && matchedSessionId === null) {
      setMmStatus("idle");
    }
  }, [matchedSessionId, query.data?.queueStatus]);

  useEffect(() => {
    if (!matchedSessionId) return;
    router.push(`/play/casual/${matchedSessionId}`);
  }, [matchedSessionId, router]);

  const disconnectSocket = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
  };

  const connectSocket = () => {
    if (socketRef.current || !socketBaseUrl) return socketRef.current;

    const socket = io(`${socketBaseUrl}/match`, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current = socket;
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on(
      "matchmaking_status",
      (data: { status: string; queueSize?: number }) => {
        if (data.status === "queued") {
          setMmStatus("queued");
          setQueueSize(typeof data.queueSize === "number" ? data.queueSize : 0);
          return;
        }

        if (data.status === "idle") {
          setMmStatus("idle");
          setQueueSize(0);
        }
      },
    );
    socket.on("matchmaking_matched", (data: { sessionId: number }) => {
      setMmStatus("matched");
      setMatchedSessionId(data.sessionId);
    });
    socket.on("matchmaking_error", (data: { message: string }) => {
      setLastError(data.message);
      setMmStatus("idle");
      setQueueSize(0);
    });

    return socket;
  };

  useEffect(() => {
    if (mmStatus === "queued") {
      connectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [mmStatus, socketBaseUrl]);

  const handleJoinQueue = () => {
    if (!selectedDeckId) return;

    setLastError(null);
    const socket = socketRef.current || connectSocket();

    if (socket) {
      socket.emit("matchmaking_join", { deckId: selectedDeckId });
      setMmStatus("queued");
    }
  };

  const handleLeaveQueue = () => {
    socketRef.current?.emit("matchmaking_leave");
    setMmStatus("idle");
    setQueueSize(0);
    disconnectSocket();
  };

  if (query.isLoading) {
    return <PlayModeLoadingShell label="Chargement du duel en ligne..." />;
  }

  if (query.error || !query.data) {
    return (
      <PlayErrorState
        message={getNeutralErrorMessage(
          query.error,
          "Impossible de charger le duel en ligne.",
        )}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      {activeSessions.length ? (
        <Card className="tcg-surface">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Parties en cours
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Duel
                </h2>
              </div>
              <Badge variant="outline">
                {activeSessions.length} session
                {activeSessions.length > 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="space-y-3">
              {activeSessions.map((session) => (
                <CasualSessionCard key={session.sessionId} session={session} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="tcg-surface tcg-surface--dark">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Duel
                </p>
                <Badge className="border-0 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20">
                  En ligne
                </Badge>
              </div>
              <h2 className="text-2xl font-black leading-tight text-white">
                Recherche de partie
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                Choisissez un deck pour lancer un duel en ligne.
              </p>
            </div>

            {mmStatus === "queued" ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {isConnected ? (
                  <Wifi className="h-3 w-3 text-emerald-400" />
                ) : (
                  <WifiOff className="h-3 w-3 text-amber-400" />
                )}
                {isConnected ? "Connecté" : "Connexion..."}
              </div>
            ) : null}
          </div>

          {lastError ? <InlineErrorMessage message={lastError} /> : null}

          {mmStatus === "matched" ? (
            <div className="space-y-3 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <div className="flex items-center justify-center gap-3 text-emerald-300">
                <Users className="h-5 w-5" />
                <span className="text-lg font-bold">Adversaire trouvé</span>
              </div>
              <p className="text-sm text-slate-300">
                Redirection vers la partie...
              </p>
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-emerald-300" />
            </div>
          ) : mmStatus === "queued" ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-200">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      Recherche en cours...
                    </p>
                    <p className="text-xs text-amber-200/80">
                      {queueSize > 1
                        ? `${queueSize} joueurs actuellement dans la file`
                        : "En attente d’un autre joueur"}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full rounded-full border-slate-600 text-slate-300 hover:text-white"
                onClick={handleLeaveQueue}
              >
                Annuler
              </Button>
            </div>
          ) : eligibleDecks.length ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Votre deck
                </p>
                <Select
                  value={selectedDeckId?.toString() ?? ""}
                  onValueChange={(value) => setSelectedDeckId(Number(value))}
                >
                  <SelectTrigger className="w-full rounded-2xl border-slate-600 bg-slate-800 text-white">
                    <SelectValue placeholder="Choisir un deck" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleDecks.map((deck) => (
                      <SelectItem key={deck.deckId} value={String(deck.deckId)}>
                        {deck.deckName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full rounded-full"
                disabled={!selectedDeckId}
                onClick={handleJoinQueue}
              >
                Lancer la recherche
                <Swords className="ml-2 h-4 w-4" />
              </Button>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">BO1</Badge>
                <Badge variant="secondary">Standard</Badge>
                <Badge variant="secondary">60 cartes</Badge>
              </div>
            </div>
          ) : (
            <PlaySoftState
              message="Aucun deck compatible pour le duel en ligne."
              tone="dark"
              action={
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-slate-600 text-slate-300 hover:text-white"
                >
                  <Link href="/decks/me">
                    Gérer mes decks
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CasualSessionCard({ session }: { session: CasualSessionSummary }) {
  return (
    <div className="tcg-note-card space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-slate-950">vs {session.opponentName}</p>
          <p className="text-sm text-slate-500">
            Duel 1v1 • Tour {session.turnNumber}
          </p>
        </div>
        <Badge variant={session.awaitingPlayerAction ? "default" : "secondary"}>
          {session.awaitingPlayerAction ? "À vous" : "Tour adverse"}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>Mise à jour {formatPlayDate(session.updatedAt)}</span>
        <Button asChild variant="outline" className="rounded-full">
          <Link href={`/play/casual/${session.sessionId}`}>
            Continuer
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function PlayModeLoadingShell({ label }: { label: string }) {
  return (
    <Card className="tcg-surface">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {label}
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      </CardContent>
    </Card>
  );
}

function PlayErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="tcg-surface border-destructive/30">
      <CardContent className="space-y-4 p-6">
        <p className="text-sm leading-6 text-destructive">{message}</p>
        <Button variant="outline" className="rounded-full" onClick={onRetry}>
          Réessayer
        </Button>
      </CardContent>
    </Card>
  );
}

function InlineErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function PlaySoftState({
  message,
  action,
  tone = "light",
}: {
  message: string;
  action?: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "tcg-empty-state space-y-4 px-5 py-6 text-center text-sm",
        tone === "dark" && "border-slate-700 bg-slate-900 text-slate-300",
      )}
    >
      <p
        className={cn(
          "leading-6",
          tone === "dark" ? "text-slate-300" : "text-slate-500",
        )}
      >
        {message}
      </p>
      {action ? <div className="flex justify-center">{action}</div> : null}
    </div>
  );
}

function PlayGuestPage() {
  return (
    <PageWrapper maxWidth="xl" gradient="none" className="tcg-page--soft">
      <div className="grid gap-6">
        <Card className="tcg-surface tcg-surface--hero tcg-surface--hero-play">
          <CardContent className="space-y-6 p-8">
            <Badge className="w-fit rounded-full border-0 bg-primary/10 text-primary hover:bg-primary/10">
              Jeu en ligne
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black leading-tight">
                Un hub clair pour reprendre vos matches et lancer vos parties.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Connectez-vous pour retrouver vos tables de tournoi, ouvrir un
                entraînement IA et démarrer un duel en ligne depuis un seul
                espace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link href="/auth/login">Se connecter</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-6"
              >
                <Link href="/auth/register">Créer un compte</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <GuestModeTile
            icon={Trophy}
            title="Tournoi"
            text="Reprenez vos rondes en cours et ouvrez vos tables prêtes à lancer."
          />
          <GuestModeTile
            icon={Sparkles}
            title="IA"
            text="Lancez une session rapide contre un preset contrôlé par l’ordinateur."
          />
          <GuestModeTile
            icon={Swords}
            title="Duel"
            text="Cherchez un adversaire humain et revenez sur vos parties actives."
          />
        </div>
      </div>
    </PageWrapper>
  );
}

function GuestModeTile({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <Card className="tcg-surface">
      <CardContent className="space-y-4 p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">{title}</h2>
          <p className="text-sm leading-6 text-slate-600">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PlayPageSkeleton() {
  return (
    <PageWrapper maxWidth="xl" gradient="none" className="tcg-page--play">
      <div className="space-y-6">
        <Skeleton className="h-[220px] rounded-[2rem]" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-64 rounded-full" />
          <div className="grid gap-4 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-44 rounded-3xl" />
            ))}
          </div>
        </div>
        <Skeleton className="h-14 rounded-[1.75rem]" />
        <Skeleton className="h-[520px] rounded-[2rem]" />
      </div>
    </PageWrapper>
  );
}

function getResumeBadgeClass(kind: ResumeKind) {
  switch (kind) {
    case "tournament_live":
      return "bg-slate-950 text-white hover:bg-slate-950";
    case "tournament_ready":
      return "bg-primary/15 text-primary hover:bg-primary/15";
    case "training_awaiting":
      return "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15";
    case "training_active":
      return "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10";
    case "duel_awaiting":
      return "bg-sky-500/15 text-sky-700 hover:bg-sky-500/15";
    case "duel_active":
      return "bg-sky-500/10 text-sky-700 hover:bg-sky-500/10";
    default:
      return "bg-slate-200 text-slate-700 hover:bg-slate-200";
  }
}
