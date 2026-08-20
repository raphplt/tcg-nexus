"use client";

import {
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  Clock3,
  Layers3,
  Loader2,
  Search,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  type ComponentType,
  type ReactNode,
  Suspense,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Socket } from "socket.io-client";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { translateApiError } from "@/utils/api-error";
import { getSocketBaseUrl } from "@/utils/socket";

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

type Translate = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

const RESUME_LIMIT = 3;

const phaseKeys: Record<string, string> = {
  qualification: "phaseQualification",
  quarter_final: "phaseQuarterFinal",
  semi_final: "phaseSemiFinal",
  final: "phaseFinal",
};

const statusKeys: Record<PlayHubMatchSummary["status"], string> = {
  scheduled: "statusScheduled",
  in_progress: "statusInProgress",
  finished: "statusFinished",
  forfeit: "statusForfeit",
  cancelled: "statusCancelled",
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

const queueFilters: Array<{ id: MatchBucket; labelKey: string }> = [
  { id: "all", labelKey: "filterAll" },
  { id: "live", labelKey: "filterLive" },
  { id: "ready", labelKey: "filterReady" },
  { id: "done", labelKey: "filterDone" },
];

const playTabs: Array<{ id: PlayTab; labelKey: string }> = [
  { id: "tournois", labelKey: "tabTournaments" },
  { id: "ia", labelKey: "tabAi" },
  { id: "duel", labelKey: "tabDuel" },
];

const difficultyKeys: Record<TrainingDifficulty, string> = {
  easy: "difficultyEasy",
  standard: "difficultyStandard",
};

const isPlayTab = (value: string | null): value is PlayTab =>
  value === "tournois" || value === "ia" || value === "duel";

const formatPlayDate = (
  locale: string,
  date?: string | null,
  fallback = "",
) => {
  if (!date) return fallback;

  return new Date(date).toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPhase = (phase: string, t: Translate) =>
  (phaseKeys[phase] ? t(phaseKeys[phase]) : "") ||
  phase
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getNeutralErrorMessage = (
  error: unknown,
  fallback: string,
  tError: Translate,
) => {
  const message = translateApiError(error, tError, fallback).trim();
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

const getMatchActionLabel = (
  status: PlayHubMatchSummary["status"],
  t: Translate,
) => (status === "in_progress" ? t("resume") : t("openTable"));

const getMatchActivity = (
  match: PlayHubMatchSummary,
  locale: string,
  t: Translate,
) => {
  if (match.status === "in_progress") {
    return {
      label: t("liveSince"),
      value: formatPlayDate(locale, match.startedAt, t("liveGame")),
      updatedAt: match.startedAt || match.scheduledDate || null,
    };
  }

  if (match.status === "scheduled") {
    return {
      label: t("scheduledFor"),
      value: formatPlayDate(locale, match.scheduledDate, t("tableReady")),
      updatedAt: match.scheduledDate || null,
    };
  }

  return {
    label: t("lastActivity"),
    value: formatPlayDate(
      locale,
      match.finishedAt || match.startedAt || match.scheduledDate,
      t("historyAvailable"),
    ),
    updatedAt:
      match.finishedAt || match.startedAt || match.scheduledDate || null,
  };
};

const sortByRecentDate = <T extends { updatedAt?: string | null }>(
  left: T,
  right: T,
) =>
  new Date(right.updatedAt || 0).getTime() -
  new Date(left.updatedAt || 0).getTime();

const buildResumeItems = (
  t: Translate,
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
      kind:
        match.status === "in_progress" ? "tournament_live" : "tournament_ready",
      priority: match.status === "in_progress" ? 0 : 1,
      title: `vs ${match.opponentName}`,
      subtitle: `${match.tournamentName} • ${formatPhase(match.phase, t)} • ${t("round", { round: match.round })}`,
      statusLabel: t(statusKeys[match.status]),
      href: `/tournaments/${match.tournamentId}/matches/${match.id}`,
      actionLabel: getMatchActionLabel(match.status, t),
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
      subtitle: `${t("ai")} ${t(difficultyKeys[session.aiDifficulty])} • ${t("turn", { turn: session.turnNumber })}`,
      statusLabel: session.awaitingPlayerAction
        ? t("yourTurn")
        : t("activeSession"),
      href: `/play/training/${session.sessionId}`,
      actionLabel: t("continue"),
      updatedAt: session.updatedAt,
    });
  }

  for (const session of casualLobby?.activeSessions || []) {
    items.push({
      kind: session.awaitingPlayerAction ? "duel_awaiting" : "duel_active",
      priority: session.awaitingPlayerAction ? 4 : 5,
      title: `vs ${session.opponentName}`,
      subtitle: `${t("duel1v1")} • ${t("turn", { turn: session.turnNumber })}`,
      statusLabel: session.awaitingPlayerAction
        ? t("yourTurnShort")
        : t("opponentTurn"),
      href: `/play/casual/${session.sessionId}`,
      actionLabel: t("continue"),
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
      (match) => match.status === "in_progress" || match.status === "scheduled",
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
  return (
    <Suspense fallback={<PlayPageSkeleton />}>
      <PlayPageContent />
    </Suspense>
  );
}

function PlayPageContent() {
  const t = useTranslations("Play");
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeFilter, setActiveFilter] = useState<MatchBucket>("all");
  const [activeTab, setActiveTab] = useState<PlayTab>("tournois");
  const [secondaryQueriesEnabled, setSecondaryQueriesEnabled] = useState(false);
  const searchParamsString = searchParams.toString();
  const tabParam = new URLSearchParams(searchParamsString).get("tab");
  const requestedTab = isPlayTab(tabParam) ? tabParam : null;
  const shouldPrioritizeSecondaryQueries =
    requestedTab === "ia" ||
    requestedTab === "duel" ||
    activeTab === "ia" ||
    activeTab === "duel";

  useEffect(() => {
    if (!isAuthenticated) {
      setSecondaryQueriesEnabled(false);
      return;
    }

    if (shouldPrioritizeSecondaryQueries) {
      setSecondaryQueriesEnabled(true);
      return;
    }

    let cancelled = false;

    const enableSecondaryQueries = () => {
      if (cancelled) return;

      startTransition(() => {
        setSecondaryQueriesEnabled(true);
      });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(enableSecondaryQueries, {
        timeout: 600,
      });

      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(enableSecondaryQueries, 0);

    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    };
  }, [isAuthenticated, shouldPrioritizeSecondaryQueries]);

  const playHubQuery = useQuery<PlayHubResponse>({
    queryKey: ["play", "hub"],
    queryFn: () => matchService.getPlayHub(),
    enabled: Boolean(isAuthenticated),
  });
  const trainingLobbyQuery = useQuery<TrainingLobbyView>({
    queryKey: ["training-matches", "lobby"],
    queryFn: () => trainingMatchService.getLobby(),
    enabled: Boolean(isAuthenticated && secondaryQueriesEnabled),
  });
  const casualLobbyQuery = useQuery<CasualLobbyView>({
    queryKey: ["casual-matches", "lobby"],
    queryFn: () => casualMatchService.getLobby(),
    enabled: Boolean(isAuthenticated && secondaryQueriesEnabled),
  });

  const playHub = playHubQuery.data;
  const trainingLobby = trainingLobbyQuery.data;
  const casualLobby = casualLobbyQuery.data;
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
    duel: duelSessionsCount + (casualLobby?.queueStatus === "queued" ? 1 : 0),
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
    () => buildResumeItems(t, playHub, trainingLobby, casualLobby),
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
                {t("accountNotReady")}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                {t("accountNotReadyHelp")}
              </p>
            </div>
            <Button asChild className="">
              <Link href="/profile">
                {t("openProfile")}
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
            secondaryQueriesEnabled &&
            (trainingLobbyQuery.isLoading || casualLobbyQuery.isLoading)
          }
        />

        <PlayResumeStrip
          items={resumeItems}
          isLoading={
            secondaryQueriesEnabled &&
            (trainingLobbyQuery.isLoading || casualLobbyQuery.isLoading)
          }
        />

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-5"
        >
          <TabsList className="tcg-play-tablist grid h-auto w-full grid-cols-3 p-1">
            {playTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="tcg-play-tab px-4 py-3 text-sm font-semibold"
              >
                <span>{t(tab.labelKey)}</span>
                {tabCounts[tab.id] > 0 ? (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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
  const t = useTranslations("Play");
  return (
    <Card className="tcg-surface tcg-surface--hero tcg-surface--hero-play border-border">
      <CardContent className="space-y-5 p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Jouer
            </p>
            <h1 className="text-3xl font-black leading-tight text-foreground md:text-[2.5rem]">
              Jouer
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              {t("subtitle")}
            </p>
          </div>

          <Button asChild variant="outline" className="">
            <Link href="/decks/me">
              {t("manageDecks")}
              <Layers3 className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <HeaderMetric
            icon={Trophy}
            label={t("tabTournaments")}
            value={String(tournamentActionCount)}
            detail="à ouvrir"
          />
          <HeaderMetric
            icon={Sparkles}
            label="Sessions"
            value={
              secondaryMetricsLoading ? "..." : String(secondarySessionsCount)
            }
            detail="en cours"
          />
          <HeaderMetric
            icon={Layers3}
            label="Decks"
            value={String(deckCount)}
            detail="compatibles"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function HeaderMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="tcg-play-stat flex min-w-[180px] flex-1 items-center gap-3 px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-black leading-none text-foreground">
            {value}
          </p>
          <p className="pb-0.5 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
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
  const t = useTranslations("Play");
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
            {t("statusInProgress")}
          </p>
          <h2 className="text-2xl font-black text-foreground">
            {t("filterLive")}
          </h2>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
            <Skeleton key={index} className="h-44" />
          ))}
        </div>
      ) : (
        <PlaySoftState message={t("noActiveGame")} />
      )}
    </section>
  );
}

function ResumeCard({ item }: { item: ResumeItem }) {
  const t = useTranslations("Play");
  const locale = useLocale();
  return (
    <Card
      className={cn(
        "tcg-surface tcg-surface--hover overflow-hidden",
        getResumeCardClass(item.kind),
      )}
      data-testid="resume-item"
    >
      <CardContent className="flex h-full flex-col gap-4 p-4">
        <div className="space-y-2">
          <Badge
            className={cn(
              "w-fit rounded-full border-0 px-2.5 py-1",
              getResumeBadgeClass(item.kind),
            )}
          >
            {item.statusLabel}
          </Badge>
          <div className="space-y-1">
            <h3 className="text-xl font-bold leading-tight text-foreground">
              {item.title}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {item.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="h-4 w-4 text-muted-foreground" />
          <span>
            {item.updatedAt
              ? `Dernière activité ${formatPlayDate(locale, item.updatedAt)}`
              : t("updateWhenAvailable")}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {getResumeContextLabel(item.kind, t)}
          </p>
          <Button asChild size="sm" className="">
            <Link href={item.href}>
              {item.actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
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
  const tError = useTranslations("ApiErrors");
  const t = useTranslations("Play");
  const hasMatches =
    liveMatches.length > 0 ||
    readyMatches.length > 0 ||
    historyMatches.length > 0;

  return (
    <Card className="tcg-surface">
      <CardContent className="space-y-5 p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
              Matches
            </p>
            <h2 className="text-2xl font-black text-foreground">
              {t("tabTournaments")}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("matchesByStatus")}
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-11 rounded-full border-border bg-muted pl-9 shadow-none"
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
              {t(filter.labelKey)}
              <span className="ml-2 text-xs opacity-70">
                {filterCounts[filter.id]}
              </span>
            </button>
          ))}
        </div>

        {query.error && filterCounts.all === 0 ? (
          <PlayErrorState
            message={getNeutralErrorMessage(
              query.error,
              t("tournamentMatchesError"),
              tError,
            )}
            onRetry={() => void query.refetch()}
          />
        ) : !hasMatches ? (
          <PlaySoftState
            message={
              hasSearch || activeFilter !== "all"
                ? t("noMatchForSearch")
                : t("noTournamentMatch")
            }
          />
        ) : (
          <div className="space-y-6">
            {liveMatches.length ? (
              <MatchSection
                title={t("filterLive")}
                description={t("matchesAlreadyOpen")}
              >
                {liveMatches.map((record) => (
                  <PlayerMatchCard key={record.match.id} record={record} />
                ))}
              </MatchSection>
            ) : null}

            {readyMatches.length ? (
              <MatchSection
                title={t("filterReady")}
                description="Tables disponibles."
              >
                {readyMatches.map((record) => (
                  <PlayerMatchCard key={record.match.id} record={record} />
                ))}
              </MatchSection>
            ) : null}

            {historyMatches.length ? (
              <MatchSection
                title={t("filterDone")}
                description={
                  historyIsTrimmed ? t("latestResults") : t("finishedMatches")
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
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
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
  const t = useTranslations("Play");
  const locale = useLocale();
  const activity = getMatchActivity(record.match, locale, t);

  return (
    <Card
      className={cn(
        "tcg-surface tcg-surface--hover border-border",
        compact && "bg-muted/40",
      )}
    >
      <CardContent className={cn("space-y-4", compact ? "p-4" : "p-5")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {record.match.tournamentName}
            </p>
            <div className="space-y-1">
              <h3
                className={cn(
                  "font-bold leading-tight text-foreground",
                  compact ? "text-lg" : "text-2xl",
                )}
              >
                vs {record.opponentName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatPhase(record.match.phase, t)} •{" "}
                {t("round", { round: record.match.round })}
              </p>
            </div>
          </div>

          <Badge variant={statusVariants[record.match.status]}>
            {t(statusKeys[record.match.status])}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            <span>
              {activity.label} {activity.value}
            </span>
          </div>
          {record.match.status !== "finished" ? (
            <div className="inline-flex items-center rounded-full bg-primary/8 px-3 py-1.5 text-primary">
              {record.match.status === "in_progress"
                ? "Table active"
                : "Table disponible"}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Match #{record.match.id}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size={compact ? "sm" : "default"} className="">
              <Link
                href={`/tournaments/${record.match.tournamentId}/matches/${record.match.id}`}
              >
                {getMatchActionLabel(record.match.status, t)}
                <Swords className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size={compact ? "sm" : "default"}
              className=""
            >
              <Link href={`/tournaments/${record.match.tournamentId}`}>
                {t("viewTournament")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
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
  const tError = useTranslations("ApiErrors");
  const t = useTranslations("Play");
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
    query.data?.aiDeckPresets.find(
      (preset) => preset.id === selectedPresetId,
    ) || null;

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
        throw new Error(t("incompleteSelection"));
      }

      return trainingMatchService.createSession({
        deckId: selectedDeckId,
        aiDeckPresetId: selectedPresetId,
        difficulty: selectedDifficulty,
      });
    },
    onSuccess: (session) => {
      setLastError(null);
      queryClient.setQueryData(
        ["training-matches", session.sessionId],
        session,
      );
      void queryClient.invalidateQueries({
        queryKey: ["training-matches", "lobby"],
      });
      router.push(`/play/training/${session.sessionId}`);
    },
    onError: (error: unknown) => {
      setLastError(
        getNeutralErrorMessage(error, t("trainingStartError"), tError),
      );
    },
  });

  if (query.isLoading) {
    return <PlayModeLoadingShell label={t("loadingTraining")} />;
  }

  if (query.error || !query.data) {
    return (
      <PlayErrorState
        message={getNeutralErrorMessage(
          query.error,
          t("trainingLoadError"),
          tError,
        )}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card className="tcg-surface border-border">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
                IA
              </p>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-foreground">
                  {t("training")}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {t("trainingHelp")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">BO1</Badge>
              <Badge variant="outline">{t("unranked")}</Badge>
            </div>
          </div>

          {lastError ? <InlineErrorMessage message={lastError} /> : null}

          {eligibleDecks.length ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Deck joueur
                  </p>
                  <Select
                    value={selectedDeckId?.toString() ?? ""}
                    onValueChange={(value) => setSelectedDeckId(Number(value))}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder={t("chooseDeck")} />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleDecks.map((deck) => (
                        <SelectItem
                          key={deck.deckId}
                          value={String(deck.deckId)}
                        >
                          {deck.deckName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Preset IA
                  </p>
                  <Select
                    value={selectedPresetId}
                    onValueChange={setSelectedPresetId}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder={t("choosePreset")} />
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
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("difficulty")}
                  </p>
                  <Select
                    value={selectedDifficulty}
                    onValueChange={(value) =>
                      setSelectedDifficulty(value as TrainingDifficulty)
                    }
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder={t("chooseLevel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {query.data.difficulties.map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {t(difficultyKeys[difficulty])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="tcg-note-card flex flex-col justify-between gap-4 p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("selectedPreset")}
                    </p>
                  </div>
                  {selectedPreset ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {selectedPreset.name}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {selectedPreset.cardCount} cartes supportées.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {t("choosePresetHelp")}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full"
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
                      {t("creating")}
                    </>
                  ) : (
                    <>
                      {t("startGame")}
                      <Swords className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <PlaySoftState
              message={t("noCompatibleDeckTraining")}
              action={
                <Button asChild className="">
                  <Link href="/decks/me">
                    {t("openMyDecks")}
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
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {t("sessionsLabel")}
                </p>
                <h3 className="mt-1 text-xl font-bold text-foreground">
                  {t("training")}
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
              <PlaySoftState message={t("noTrainingSession")} />
            )}
          </CardContent>
        </Card>

        {blockedDecks.length ? (
          <Card className="tcg-surface">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("incompatibilities")}
                </p>
              </div>
              <div className="space-y-3">
                {blockedDecks.slice(0, 3).map((deck) => (
                  <div
                    key={deck.deckId}
                    className="tcg-note-card space-y-2 p-4"
                  >
                    <p className="font-semibold text-foreground">
                      {deck.deckName}
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {deck.reasons[0]?.message || t("unsupportedDeck")}
                    </p>
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/decks/me">
                  {t("fixMyDecks")}
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
  const t = useTranslations("Play");
  const locale = useLocale();
  return (
    <div className="tcg-note-card space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            {session.aiDeckPresetName}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("ai")} {t(difficultyKeys[session.aiDifficulty])} •{" "}
            {t("turnLabel")} {session.turnNumber}
          </p>
        </div>
        <Badge variant={session.awaitingPlayerAction ? "default" : "secondary"}>
          {session.awaitingPlayerAction ? t("yourTurn") : t("aiTurn")}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>Mise à jour {formatPlayDate(locale, session.updatedAt)}</span>
        <Button asChild variant="outline" className="">
          <Link href={`/play/training/${session.sessionId}`}>
            {t("continue")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function PlayDuelTab({ query }: { query: UseQueryResult<CasualLobbyView> }) {
  const tError = useTranslations("ApiErrors");
  const t = useTranslations("Play");
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const socketPromiseRef = useRef<Promise<Socket | null> | null>(null);
  // Queue parameters kept in a ref so the socket "connect" handler can re-join
  // after a network drop without being re-created on every state change.
  const queuedRequestRef = useRef<{ deckId: number; isRanked: boolean } | null>(
    null,
  );
  const hasConnectedOnceRef = useRef(false);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [isRanked, setIsRanked] = useState(false);
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
  const socketBaseUrl = useMemo(() => getSocketBaseUrl(), []);

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

  const disconnectSocket = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    socketPromiseRef.current = null;
    setIsConnected(false);
  }, []);

  const connectSocket = useCallback(async (): Promise<Socket | null> => {
    if (socketRef.current || !socketBaseUrl) {
      return socketRef.current;
    }

    if (!socketPromiseRef.current) {
      socketPromiseRef.current = (async () => {
        const { io } = await import("socket.io-client");
        const socket = io(`${socketBaseUrl}/match`, {
          transports: ["websocket"],
          withCredentials: true,
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
        });

        socketRef.current = socket;
        socket.on("connect", () => {
          setIsConnected(true);
          // The server drops queue entries on disconnect, so a reconnection has
          // to re-announce the player. The very first connect is skipped: the
          // initial join was already emitted (and buffered) by handleJoinQueue.
          const queuedRequest = queuedRequestRef.current;
          if (queuedRequest && hasConnectedOnceRef.current) {
            socket.emit("matchmaking_join", queuedRequest);
          }
          hasConnectedOnceRef.current = true;
        });
        socket.on("disconnect", () => setIsConnected(false));
        socket.on(
          "matchmaking_status",
          (data: { status: string; queueSize?: number }) => {
            if (data.status === "queued") {
              setMmStatus("queued");
              setQueueSize(
                typeof data.queueSize === "number" ? data.queueSize : 0,
              );
              return;
            }

            if (data.status === "idle") {
              setMmStatus("idle");
              setQueueSize(0);
            }
          },
        );
        socket.on("matchmaking_matched", (data: { sessionId: number }) => {
          queuedRequestRef.current = null;
          setMmStatus("matched");
          setMatchedSessionId(data.sessionId);
        });
        socket.on("matchmaking_error", (data: { message: string }) => {
          queuedRequestRef.current = null;
          setLastError(data.message);
          setMmStatus("idle");
          setQueueSize(0);
        });

        return socket;
      })().finally(() => {
        socketPromiseRef.current = null;
      });
    }

    return socketPromiseRef.current;
  }, [socketBaseUrl]);

  // Only tear the socket down when the tab unmounts. Reacting to `mmStatus`
  // here would disconnect the socket right after `matchmaking_join` was
  // emitted, silently dropping the player from the queue.
  useEffect(() => disconnectSocket, [disconnectSocket]);

  const handleJoinQueue = async () => {
    if (!selectedDeckId) return;

    setLastError(null);
    const request = { deckId: selectedDeckId, isRanked };
    queuedRequestRef.current = request;
    setMmStatus("queued");

    const socket = socketRef.current || (await connectSocket());

    if (!socket) {
      queuedRequestRef.current = null;
      setMmStatus("idle");
      setLastError(t("duelLoadError"));
      return;
    }

    // socket.io buffers emits issued before the handshake completes.
    socket.emit("matchmaking_join", request);
  };

  const handleLeaveQueue = () => {
    queuedRequestRef.current = null;
    socketRef.current?.emit("matchmaking_leave");
    setMmStatus("idle");
    setQueueSize(0);
    disconnectSocket();
  };

  if (query.isLoading) {
    return <PlayModeLoadingShell label={t("loadingDuel")} />;
  }

  if (query.error || !query.data) {
    return (
      <PlayErrorState
        message={getNeutralErrorMessage(
          query.error,
          t("duelLoadError"),
          tError,
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
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Sessions
                </p>
                <h2 className="mt-1 text-2xl font-black text-foreground">
                  {t("tabDuel")}
                </h2>
              </div>
              <Badge variant="outline">
                {t("sessionCount", { count: activeSessions.length })}
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

      <Card className="tcg-surface border-border">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
                  {t("tabDuel")}
                </p>
                <Badge variant="outline">{t("online")}</Badge>
              </div>
              <h2 className="text-2xl font-black leading-tight text-foreground">
                {t("matchmaking")}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {t("matchmakingHelp")}
              </p>
            </div>

            {mmStatus === "queued" ? (
              <div className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                {isConnected ? t("connected") : t("connecting")}
              </div>
            ) : null}
          </div>

          {lastError ? <InlineErrorMessage message={lastError} /> : null}

          {mmStatus === "matched" ? (
            <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/8 p-5 text-center">
              <div className="flex items-center justify-center gap-3 text-emerald-700">
                <Users className="h-5 w-5" />
                <span className="text-lg font-bold">{t("opponentFound")}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("openingGame")}
              </p>
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-emerald-700" />
            </div>
          ) : mmStatus === "queued" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/8 p-5 text-amber-700">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{t("searching")}</p>
                    <p className="text-xs text-amber-700/80">
                      {queueSize > 1
                        ? t("playersInQueue", { count: queueSize })
                        : t("waitingForPlayer")}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleLeaveQueue}
              >
                {t("cancel")}
              </Button>
            </div>
          ) : eligibleDecks.length ? (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("yourDeck")}
                  </p>
                  <Select
                    value={selectedDeckId?.toString() ?? ""}
                    onValueChange={(value) => setSelectedDeckId(Number(value))}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder={t("chooseDeck")} />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleDecks.map((deck) => (
                        <SelectItem
                          key={deck.deckId}
                          value={String(deck.deckId)}
                        >
                          {deck.deckName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="play-ranked-toggle"
                      className="text-sm font-semibold"
                    >
                      {t("rankedMatch")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("rankedMatchHelp")}
                    </p>
                  </div>
                  <Switch
                    id="play-ranked-toggle"
                    checked={isRanked}
                    onCheckedChange={setIsRanked}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">BO1</Badge>
                  <Badge variant="secondary">{t("difficultyStandard")}</Badge>
                  <Badge variant="secondary">60 cartes</Badge>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!selectedDeckId}
                onClick={() => void handleJoinQueue()}
              >
                {isRanked ? t("startRankedMatch") : t("startSearch")}
                <Swords className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <PlaySoftState
              message={t("noCompatibleDeckDuel")}
              action={
                <Button asChild variant="outline" className="">
                  <Link href="/decks/me">
                    {t("manageDecks")}
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
  const t = useTranslations("Play");
  const locale = useLocale();
  return (
    <div className="tcg-note-card space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            vs {session.opponentName}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("duelSummary", { turn: session.turnNumber })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {session.isRanked ? t("rankedBadge") : t("casualBadge")}
          </Badge>
          <Badge
            variant={session.awaitingPlayerAction ? "default" : "secondary"}
          >
            {session.awaitingPlayerAction
              ? t("yourTurnShort")
              : t("opponentTurn")}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {t("updatedAt", { date: formatPlayDate(locale, session.updatedAt) })}
        </span>
        <Button asChild variant="outline" className="">
          <Link href={`/play/casual/${session.sessionId}`}>
            {t("continue")}
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
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {label}
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-24" />
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
  const t = useTranslations("Play");
  return (
    <Card className="tcg-surface border-destructive/30">
      <CardContent className="space-y-4 p-6">
        <p className="text-sm leading-6 text-destructive">{message}</p>
        <Button variant="outline" className="" onClick={onRetry}>
          {t("retry")}
        </Button>
      </CardContent>
    </Card>
  );
}

function InlineErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
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
        tone === "dark" && "panel-hero-dark",
      )}
    >
      <p className={cn("leading-6", "text-muted-foreground")}>{message}</p>
      {action ? <div className="flex justify-center">{action}</div> : null}
    </div>
  );
}

function PlayGuestPage() {
  const t = useTranslations("Play");
  return (
    <PageWrapper maxWidth="xl" gradient="none" className="tcg-page--soft">
      <div className="grid gap-6">
        <Card className="tcg-surface tcg-surface--hero tcg-surface--hero-play">
          <CardContent className="space-y-6 p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Jouer
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black leading-tight">
                {t("signInToPlay")}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                {t("signInHelp")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="px-6">
                <Link href="/auth/login">{t("signIn")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-6">
                <Link href="/auth/register">{t("createAccount")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <GuestModeTile
            icon={Trophy}
            title="Tournoi"
            text={t("tournamentsTabHelp")}
          />
          <GuestModeTile icon={Sparkles} title="IA" text={t("aiTabHelp")} />
          <GuestModeTile
            icon={Swords}
            title={t("tabDuel")}
            text={t("duelTabHelp")}
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
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PlayPageSkeleton() {
  return (
    <PageWrapper maxWidth="xl" gradient="none" className="tcg-page--play">
      <div className="space-y-6">
        <Skeleton className="h-[188px] rounded-[2rem]" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-64 rounded-full" />
          <div className="grid gap-4 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-40" />
            ))}
          </div>
        </div>
        <Skeleton className="h-12 rounded-[1.25rem]" />
        <Skeleton className="h-[460px] rounded-[2rem]" />
      </div>
    </PageWrapper>
  );
}

function getResumeBadgeClass(kind: ResumeKind) {
  switch (kind) {
    case "tournament_live":
      return "bg-foreground text-background hover:bg-foreground";
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
      return "bg-muted text-foreground hover:bg-muted";
  }
}

function getResumeCardClass(kind: ResumeKind) {
  switch (kind) {
    case "tournament_live":
    case "tournament_ready":
      return "bg-card";
    case "training_awaiting":
    case "training_active":
      return "bg-card";
    case "duel_awaiting":
    case "duel_active":
      return "bg-card";
    default:
      return "";
  }
}

function getResumeContextLabel(kind: ResumeKind, t: Translate) {
  switch (kind) {
    case "tournament_live":
    case "tournament_ready":
      return t("tabTournaments");
    case "training_awaiting":
    case "training_active":
      return t("training");
    case "duel_awaiting":
    case "duel_active":
      return t("tabDuel");
  }
}
