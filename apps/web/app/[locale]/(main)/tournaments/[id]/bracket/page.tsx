"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Grid3X3,
  Maximize2,
  Minimize2,
  RefreshCw,
  Swords,
  Trophy,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useState } from "react";
import { H1 } from "@/components/Shared/Titles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useBracket } from "@/hooks/useBracket";
import { useTournament } from "@/hooks/useTournament";
import { tournamentService } from "@/services/tournament.service";
import { EliminationBracket } from "./_components/EliminationBracket";

export default function BracketPage() {
  const t = useTranslations("Bracket");
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    tournament,
    progress,
    isLoading: tournamentLoading,
  } = useTournament(id as string);
  const {
    bracket,
    isLoading: bracketLoading,
    totalMatches,
    completedMatches,
    progressPercentage,
    isSwiss,
    isRoundRobin,
    isElimination,
    error,
    refetch,
  } = useBracket(id as string);

  const { data: myMatch } = useQuery({
    queryKey: ["tournament", id, "matches", "me"],
    queryFn: () => tournamentService.getMyPendingMatch(id as string),
    enabled: Boolean(id && user?.player?.id),
    refetchInterval: 15_000,
  });

  const isLoading = tournamentLoading || bracketLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament || error) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-7xl mx-auto text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h1 className="text-2xl font-bold mb-4">{t("unavailable")}</h1>
          <p className="text-muted-foreground mb-4">{t("loadError")}</p>
          <Button asChild>
            <Link href={`/tournaments/${id}`}>{t("backToTournament")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!bracket) return null;

  const getBracketTypeIcon = () => {
    switch (bracket.type) {
      case "single_elimination":
        return <Trophy className="w-5 h-5" />;
      case "double_elimination":
        return <Trophy className="w-5 h-5" />;
      case "swiss_system":
        return <RefreshCw className="w-5 h-5" />;
      case "round_robin":
        return <Grid3X3 className="w-5 h-5" />;
      default:
        return <Trophy className="w-5 h-5" />;
    }
  };

  const getBracketTypeName = () => {
    switch (bracket.type) {
      case "single_elimination":
        return t("singleElimination");
      case "double_elimination":
        return t("doubleElimination");
      case "swiss_system":
        return t("swiss");
      case "round_robin":
        return t("allRounds");
      default:
        return "Inconnu";
    }
  };

  return (
    <div
      className={`min-h-screen bg-background px-4 py-10 ${isFullscreen ? "fixed inset-0 z-50 overflow-auto" : ""}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {!isFullscreen && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/tournaments/${id}`}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Link>
              </Button>
            )}

            <div>
              <H1 className="flex items-center gap-2 mb-2">
                {getBracketTypeIcon()}
                Tableau — {tournament.name}
              </H1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Badge variant="outline">{getBracketTypeName()}</Badge>
                <span>
                  {progress?.completedMatches ?? completedMatches}/
                  {progress?.totalMatches ?? totalMatches} matchs terminés
                </span>
                <span>
                  {Math.round(
                    progress?.progressPercentage ?? progressPercentage,
                  )}
                  % terminé
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await refetch();
                } finally {
                  setIsRefreshing(false);
                }
              }}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Actualiser
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              aria-label={
                isFullscreen ? t("exitFullscreen") : t("enterFullscreen")
              }
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {myMatch && (
          <Card className="mb-6 border-primary/40 bg-primary/5">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Swords className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">
                    Tu as un match en attente — ronde {myMatch.round}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {myMatch.status === "in_progress"
                      ? t("resumeGame")
                      : "Lance ta partie en ligne"}
                  </p>
                </div>
              </div>
              <Button
                onClick={() =>
                  router.push(`/tournaments/${id}/matches/${myMatch.matchId}`)
                }
              >
                {t("joinMyMatch")}
              </Button>
            </CardContent>
          </Card>
        )}

        {bracket.rounds.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <Trophy className="mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="text-xl font-semibold">
                {tournament.isExternal
                  ? t("externalResults")
                  : t("generatedOnStart")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                {tournament.isExternal
                  ? t("externalNotice")
                  : t("generatedNotice")}
              </p>
              {tournament.isExternal && tournament.externalRegistrationUrl && (
                <Button className="mt-5" asChild>
                  <a
                    href={tournament.externalRegistrationUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("openOrganizerSite")}
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 sm:p-6">
              {isElimination && (
                <EliminationBracket
                  bracket={bracket}
                  onMatchClick={(matchId) =>
                    router.push(`/tournaments/${id}/matches/${matchId}`)
                  }
                  interactive={true}
                />
              )}

              {(isSwiss || isRoundRobin) && (
                <div className="py-12 text-center">
                  <p className="font-medium">{t("externalRoundTracking")}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("notOrchestrated")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
