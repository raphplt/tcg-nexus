"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock3,
  Gamepad2,
  Layers3,
  Loader2,
  Search,
  Swords,
  Trophy,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { MatchmakingPanel } from "@/components/match/MatchmakingPanel";
import { TrainingLobbyPanel } from "@/components/match/TrainingLobbyPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { matchService } from "@/services/match.service";
import { PlayHubMatchSummary, PlayHubResponse } from "@/types/play-hub";

type MatchBucket = "all" | "live" | "ready" | "done";

interface PlayerMatchRecord {
  match: PlayHubMatchSummary;
  opponentName: string;
  bucket: Exclude<MatchBucket, "all">;
}

const phaseLabels: Record<PlayHubMatchSummary["phase"], string> = {
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
  { id: "live", label: "En cours" },
  { id: "ready", label: "Prêt à jouer" },
  { id: "done", label: "Archives" },
];

const formatDate = (date?: string | null) => {
  if (!date) return "Date à confirmer";
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getMatchBucket = (
  status: PlayHubMatchSummary["status"],
): PlayerMatchRecord["bucket"] => {
  if (status === "in_progress") return "live";
  if (status === "scheduled") return "ready";
  return "done";
};

export default function PlayPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<MatchBucket>("all");

  const playHubQuery = useQuery<PlayHubResponse>({
    queryKey: ["play", "hub"],
    queryFn: () => matchService.getPlayHub(),
    enabled: Boolean(isAuthenticated),
  });

  const playHub = playHubQuery.data;
  const matchRecords = useMemo(
    () =>
      (playHub?.matches || []).map((match) => ({
        match,
        opponentName: match.opponentName,
        bucket: getMatchBucket(match.status),
      })),
    [playHub?.matches],
  );
  const decks = playHub?.recentDecks || [];
  const liveCount = playHub?.summary.liveMatches || 0;
  const readyCount = playHub?.summary.readyMatches || 0;

  const filteredMatches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

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
  }, [activeFilter, matchRecords, search]);

  if (isLoading) {
    return (
      <PageWrapper maxWidth="xl" gradient="none" className="tcg-page--soft">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <Skeleton className="h-[340px] rounded-3xl" />
          <Skeleton className="h-[340px] rounded-3xl" />
        </div>
      </PageWrapper>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageWrapper maxWidth="xl" gradient="none" className="tcg-page--soft">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <Card className="tcg-surface tcg-surface--hero tcg-surface--hero-play">
            <CardContent className="space-y-6 p-8">
              <Badge className="w-fit rounded-full border-0 bg-primary/10 text-primary hover:bg-primary/10">
                Jeu en ligne
              </Badge>
              <div className="space-y-4">
                <h1 className="text-4xl font-black leading-tight">
                  Retrouvez vos matches en ligne et préparez vos prochaines
                  parties.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600">
                  Connectez-vous pour voir vos tables de tournoi en cours, vos
                  matches prêts à lancer, vos sessions d’entraînement et
                  l’espace qui accueillera le ranked.
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

          <Card className="tcg-surface tcg-surface--dark">
            <CardContent className="space-y-4 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Parcours de jeu
              </p>
              <StepRow
                index="01"
                title="Rejoignez un tournoi"
                text="Les matches attribués apparaissent ici automatiquement dès qu'ils existent."
                tone="dark"
              />
              <StepRow
                index="02"
                title="Choisissez votre deck"
                text="La vérification de compatibilité se fait à l'ouverture de la table."
                tone="dark"
              />
              <StepRow
                index="03"
                title="Lancez aussi un entraînement"
                text="Le mode IA permet de jouer immédiatement avec un deck compatible."
                tone="dark"
              />
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
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
                Votre compte n'est pas encore rattaché à un profil joueur.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Le backend n'a pas encore réussi à générer un profil joueur
                exploitable pour ce compte.
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

  return (
    <PageWrapper maxWidth="xl" gradient="none" className="tcg-page--play">
      <div className="space-y-8">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
          <div className="tcg-surface tcg-surface--hero tcg-surface--hero-play p-8">
            <div className="space-y-6">
              <Badge className="w-fit rounded-full border-0 bg-primary/10 text-primary hover:bg-primary/10">
                Jouer en ligne
              </Badge>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-5xl">
                  Retrouvez vos matches et lancez vos parties.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
                  Reprenez vos matches de tournoi, lancez un entraînement contre
                  l’IA et gardez tous vos accès de jeu au même endroit.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <HeroMetric
                  label="Tables en cours"
                  value={String(liveCount)}
                  detail="Parties à reprendre"
                />
                <HeroMetric
                  label="Matches prêts"
                  value={String(readyCount)}
                  detail="Ouverts au lancement"
                />
                <HeroMetric
                  label="Decks disponibles"
                  value={String(playHub?.summary.totalDecks || 0)}
                  detail="Vérification au lancement"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full px-6">
                  <Link href="#match-list">
                    Voir mes matches
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-6"
                >
                  <Link href="#training-ai">
                    S’entraîner contre l’IA
                    <Swords className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-6"
                >
                  <Link href="/decks/me">
                    Gérer mes decks
                    <Layers3 className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="rounded-full px-4"
                >
                  <Link href="/tournaments">
                    Retour aux tournois
                    <Trophy className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <TrainingLobbyPanel />

            <MatchmakingPanel />

            <Card className="tcg-surface">
              <CardContent className="space-y-4 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Comment ça se lance
                </p>
                <StepRow
                  index="01"
                  title="Le tournoi crée le match"
                  text="Les pairings du tournoi génèrent la table à jouer."
                />
                <StepRow
                  index="02"
                  title="Les joueurs ouvrent la table"
                  text="Chacun rejoint son match et choisit un deck compatible."
                />
                <StepRow
                  index="03"
                  title="Le plateau prend le relais"
                  text="La partie démarre dès que les deux decks sont validés ou immédiatement contre l’IA."
                />
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <Card id="match-list" className="tcg-surface tcg-surface--hero">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
                    Mes tables
                  </p>
                  <h2 className="text-2xl font-black">
                    Trouver un match à jouer
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600">
                    Recherchez par tournoi, adversaire ou numéro de match. Les
                    cartes ci-dessous sont les vraies parties que vous pouvez
                    rejoindre ou reprendre.
                  </p>
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher un tournoi, un adversaire, un match..."
                    className="rounded-full border-slate-200 bg-slate-50 pl-9"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {queueFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={cn(
                      "tcg-filter-chip",
                      activeFilter === filter.id && "tcg-filter-chip--active",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {playHubQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-40 w-full rounded-3xl" />
                  ))}
                </div>
              ) : playHubQuery.error ? (
                <SoftEmptyState message="Impossible de charger vos matches pour le moment." />
              ) : filteredMatches.length ? (
                <div className="space-y-4">
                  {filteredMatches.map((record) => (
                    <PlayerMatchCard key={record.match.id} record={record} />
                  ))}
                </div>
              ) : (
                <SoftEmptyState message="Aucun match ne correspond à cette recherche. Si vous attendez une ronde, retournez sur les tournois ou vérifiez vos inscriptions." />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="tcg-surface">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Decks récents
                    </p>
                    <h3 className="mt-1 text-xl font-bold">
                      Prêts pour la table
                    </h3>
                  </div>
                  {playHubQuery.isLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>

                {decks.length ? (
                  <div className="space-y-3">
                    {decks.slice(0, 4).map((deck) => (
                      <div
                        key={deck.id}
                        className="rounded-3xl border border-slate-200/80 bg-slate-50/80 px-4 py-3"
                      >
                        <p className="font-semibold text-slate-950">
                          {deck.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          La compatibilité online est vérifiée à l’ouverture du
                          match.
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <SoftEmptyState message="Aucun deck détecté sur votre compte pour l'instant." />
                )}

                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-full"
                >
                  <Link href="/decks/me">
                    Ouvrir mes decks
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="tcg-surface tcg-surface--highlight">
              <CardContent className="space-y-4 p-6">
                <Badge className="w-fit rounded-full border-0 bg-primary/10 text-primary hover:bg-primary/10">
                  Important
                </Badge>
                <h3 className="text-xl font-bold leading-tight">
                  Tout votre jeu en ligne est ici.
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Reprenez vos rondes de tournoi, entraînez-vous contre l’IA ou
                  lancez un match 1v1 contre un autre joueur depuis cette page.
                </p>
                <Button asChild className="rounded-full">
                  <Link href="/tournaments">
                    Voir les tournois
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

function HeroMetric({
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

function StepRow({
  index,
  title,
  text,
  tone = "light",
}: {
  index: string;
  title: string;
  text: string;
  tone?: "light" | "dark";
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-2xl bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
        {index}
      </div>
      <div className="space-y-1">
        <p
          className={
            tone === "dark"
              ? "font-semibold text-white"
              : "font-semibold text-slate-950"
          }
        >
          {title}
        </p>
        <p
          className={
            tone === "dark"
              ? "text-sm leading-6 text-slate-300"
              : "text-sm leading-6 text-slate-600"
          }
        >
          {text}
        </p>
      </div>
    </div>
  );
}

function PlayerMatchCard({ record }: { record: PlayerMatchRecord }) {
  const actionLabel =
    record.match.status === "in_progress"
      ? "Reprendre la partie"
      : "Ouvrir la table";

  return (
    <Card className="tcg-surface tcg-surface--hover">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {record.match.tournamentName}
            </p>
            <h3 className="text-2xl font-bold leading-tight text-slate-950">
              Match #{record.match.id}
            </h3>
            <p className="text-sm text-slate-600">
              {phaseLabels[record.match.phase]} - Round {record.match.round}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[record.match.status]}>
              {statusLabels[record.match.status]}
            </Badge>
            <Badge variant="outline">{record.opponentName}</Badge>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <InfoPill
            icon={UserRound}
            label="Adversaire"
            value={record.opponentName}
          />
          <InfoPill
            icon={Clock3}
            label="Horaire"
            value={formatDate(
              record.match.startedAt ||
                record.match.scheduledDate ||
                record.match.finishedAt,
            )}
          />
          <InfoPill
            icon={Gamepad2}
            label="Lancement"
            value={
              record.match.status === "in_progress"
                ? "Partie en cours"
                : "Deck à choisir à l'ouverture"
            }
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full">
            <Link
              href={`/tournaments/${record.match.tournamentId}/matches/${record.match.id}`}
            >
              {actionLabel}
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

function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="tcg-note-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SoftEmptyState({ message }: { message: string }) {
  return (
    <div className="tcg-empty-state px-5 py-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
