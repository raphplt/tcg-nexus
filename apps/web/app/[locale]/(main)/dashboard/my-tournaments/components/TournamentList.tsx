import React from "react";
import { Link } from "@/i18n/navigation";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  BarChart3,
  Eye,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tournament } from "@/types/tournament";
import { useLocale, useTranslations } from "next-intl";

interface TournamentListProps {
  tournaments: Tournament[];
  isLoading: boolean;
  showRanking?: boolean;
  userId?: number;
}

export function TournamentList({
  tournaments,
  isLoading,
  showRanking = false,
  userId,
}: TournamentListProps) {
  const locale = useLocale();
  const t = useTranslations("Dashboard.myTournaments.list");
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t("empty")}</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "single_elimination":
        return <Target className="w-4 h-4" />;
      case "double_elimination":
        return <Trophy className="w-4 h-4" />;
      case "swiss_system":
        return <BarChart3 className="w-4 h-4" />;
      case "round_robin":
        return <Users className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "outline" as const, label: t("status.draft") },
      registration_open: {
        variant: "secondary" as const,
        label: t("status.registrationOpen"),
      },
      registration_closed: {
        variant: "outline" as const,
        label: t("status.registrationClosed"),
      },
      in_progress: {
        variant: "default" as const,
        label: t("status.inProgress"),
      },
      finished: { variant: "secondary" as const, label: t("status.finished") },
      cancelled: {
        variant: "destructive" as const,
        label: t("status.cancelled"),
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {tournaments.map((tournament) => {
        const playerRanking =
          showRanking && userId
            ? tournament.rankings?.find((r) => r.player.id === userId)
            : null;

        return (
          <Card
            key={tournament.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getTypeIcon(tournament.type)}
                    <h3 className="text-xl font-bold">{tournament.name}</h3>
                    {getStatusBadge(tournament.status)}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(tournament.startDate)}
                    </span>
                    {tournament.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {tournament.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {t("players", {
                        count: tournament.players?.length || 0,
                      })}
                    </span>
                  </div>

                  {/* Résultat du joueur */}
                  {showRanking && playerRanking && (
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">
                          {t("rank", { rank: playerRanking.rank })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-500" />
                        <span>
                          {t("points", { count: playerRanking.points })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-green-500" />
                        <span>
                          {t("winsPercent", {
                            value: playerRanking.winRate.toFixed(1),
                          })}
                        </span>
                      </div>
                    </div>
                  )}

                  {tournament.description && (
                    <p className="text-sm text-muted-foreground">
                      {tournament.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tournaments/${tournament.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      {t("view")}
                    </Link>
                  </Button>

                  {tournament.status === "in_progress" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/tournaments/${tournament.id}/player`}>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        {t("dashboard")}
                      </Link>
                    </Button>
                  )}

                  {(tournament.status === "in_progress" ||
                    tournament.status === "finished") && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/tournaments/${tournament.id}/bracket`}>
                        <Trophy className="w-4 h-4 mr-2" />
                        {t("bracket")}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
