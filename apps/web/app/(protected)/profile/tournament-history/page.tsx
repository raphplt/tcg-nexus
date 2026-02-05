"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { playerService } from "@/services/player.service";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  TrendingUp,
  Target,
  Calendar,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { TournamentHistoryItem } from "@/types/player-history";
import { tournamentStatusTranslation } from "@/utils/tournaments";

const periodOptions = [
  { label: "Dernier mois", value: "1m" },
  { label: "3 mois", value: "3m" },
  { label: "Année", value: "1y" },
  { label: "Tout", value: "all" },
] as const;

type PeriodValue = (typeof periodOptions)[number]["value"];

const TournamentHistoryPage = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodValue>("all");

  const playerId = user?.player?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["player", playerId, "tournament-history", period],
    queryFn: () => playerService.getTournamentHistory(playerId!, period),
    enabled: !!playerId,
  });

  const history = data?.history ?? [];

  const chartData = useMemo(
    () =>
      history.map((item) => ({
        name: item.tournament?.endDate
          ? format(new Date(item.tournament.endDate), "dd/MM")
          : "-",
        elo: item.eloAfter,
      })),
    [history],
  );

  const sortedHistory = useMemo(
    () =>
      [...history].sort((a, b) => {
        const dateA = a.tournament?.endDate
          ? new Date(a.tournament.endDate).getTime()
          : 0;
        const dateB = b.tournament?.endDate
          ? new Date(b.tournament.endDate).getTime()
          : 0;
        return dateB - dateA;
      }),
    [history],
  );

  if (!playerId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun profil joueur</h3>
          <p className="text-muted-foreground">
            Vous devez créer un profil joueur pour consulter l&apos;historique.
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-4"
          >
            <Link href="/profile">Retour au profil</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Historique des tournois</h1>
          <p className="text-sm text-muted-foreground">
            Suivez vos performances et l&apos;évolution de votre ELO.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
        >
          <Link href="/profile">Retour au profil</Link>
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={period === option.value ? "default" : "outline"}
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">
                Tournois joués
              </div>
              <div className="text-2xl font-bold">
                {data?.stats.totalTournaments ?? 0}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">Taux victoire</div>
              <div className="text-2xl font-bold">
                {data?.stats.winRate?.toFixed(1) ?? "0.0"}%
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">Meilleur rang</div>
              <div className="text-2xl font-bold">
                {data?.stats.bestRank ?? "-"}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Évolution ELO</h2>
        </div>
        {isLoading ? (
          <div className="h-48 bg-muted animate-pulse rounded-md" />
        ) : history.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Aucun tournoi passé sur cette période.
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="elo"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Résultats détaillés</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-muted animate-pulse rounded-md"
              />
            ))}
          </div>
        ) : sortedHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun tournoi terminé sur cette période.
          </p>
        ) : (
          <div className="space-y-3">
            {sortedHistory.map((item) => (
              <TournamentHistoryRow
                key={item.tournament.id}
                item={item}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const TournamentHistoryRow = ({ item }: { item: TournamentHistoryItem }) => {
  const statusLabel =
    tournamentStatusTranslation[
      item.tournament.status as keyof typeof tournamentStatusTranslation
    ] || item.tournament.status;
  const eloColor = item.eloDelta >= 0 ? "text-green-600" : "text-red-600";

  return (
    <Link
      href={`/tournaments/${item.tournament.id}`}
      className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-lg">{item.tournament.name}</span>
            <Badge variant="outline">{statusLabel}</Badge>
            <Badge variant="secondary">Rang #{item.rank}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {item.tournament.endDate
              ? format(new Date(item.tournament.endDate), "dd/MM/yyyy")
              : "Date inconnue"}
          </div>
          <div className="text-sm text-muted-foreground">
            Points gagnés: {item.points} • Victoires: {item.wins} • Défaites:
            {` ${item.losses}`} • Égalités: {item.draws}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`font-semibold ${eloColor}`}>
              {item.eloDelta >= 0 ? "+" : ""}
              {item.eloDelta} ELO
            </div>
            <div className="text-sm text-muted-foreground">
              {item.eloBefore} → {item.eloAfter}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
};

export default TournamentHistoryPage;
