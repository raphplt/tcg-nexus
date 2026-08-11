"use client";

import { useTranslations } from "next-intl";
import { Crown, Medal, Target, Trophy } from "lucide-react";
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BracketMatch, BracketStructure } from "@/types/tournament";

interface EliminationBracketProps {
  bracket: BracketStructure;
  onMatchClick?: (matchId: number) => void;
  interactive?: boolean;
}

interface BracketMatchProps {
  match: BracketMatch;
  onClick?: (matchId: number) => void;
  interactive?: boolean;
}

function BracketMatchComponent({
  match,
  onClick,
  interactive = true,
}: BracketMatchProps) {
  const t = useTranslations("EliminationBracket");
  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case "final":
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case "semi_final":
        return <Trophy className="w-4 h-4 text-orange-500" />;
      case "quarter_final":
        return <Medal className="w-4 h-4 text-bronze-500" />;
      default:
        return <Target className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    if (["finished", "forfeit"].includes(match.status ?? "")) {
      return "border-emerald-500/40 bg-emerald-500/5";
    }
    if (match.status === "in_progress") {
      return "border-primary/60 bg-primary/5";
    }
    return "border-border bg-card";
  };

  const isWinner = (playerId?: number) => {
    return match.winnerId === playerId;
  };

  return (
    <Card
      className={`w-64 ${getStatusColor()} transition-all duration-200 ${
        interactive && match.matchId ? "hover:shadow-md cursor-pointer" : ""
      }`}
      onClick={() => {
        if (interactive && match.matchId && onClick) {
          onClick(match.matchId);
        }
      }}
    >
      <CardContent className="p-3">
        {/* Header du match */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            {getPhaseIcon(match.phase)}
            <span className="text-xs font-medium text-muted-foreground">
              Round {match.round}
            </span>
          </div>
          {match.matchId && (
            <Badge variant="outline" className="text-xs">
              #{match.matchId}
            </Badge>
          )}
        </div>

        {/* Joueurs */}
        <div className="space-y-2">
          {/* Joueur A */}
          <div
            className={`flex items-center gap-2 p-2 rounded ${
              isWinner(match.playerA?.id)
                ? "border border-emerald-500/40 bg-emerald-500/10"
                : "bg-muted/40"
            }`}
          >
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">
                {match.playerA?.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {match.playerA?.name || t("toBeDetermined")}
              </p>
              {match.playerA?.seed && (
                <p className="text-xs text-muted-foreground">
                  Seed {match.playerA.seed}
                </p>
              )}
            </div>
            {isWinner(match.playerA?.id) && (
              <Crown className="w-4 h-4 text-yellow-500" />
            )}
          </div>

          {/* VS */}
          <div className="text-center">
            <span className="text-xs font-bold text-muted-foreground">VS</span>
          </div>

          {/* Joueur B */}
          <div
            className={`flex items-center gap-2 p-2 rounded ${
              isWinner(match.playerB?.id)
                ? "border border-emerald-500/40 bg-emerald-500/10"
                : "bg-muted/40"
            }`}
          >
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">
                {match.playerB?.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {match.playerB?.name || t("toBeDetermined")}
              </p>
              {match.playerB?.seed && (
                <p className="text-xs text-muted-foreground">
                  Seed {match.playerB.seed}
                </p>
              )}
            </div>
            {isWinner(match.playerB?.id) && (
              <Crown className="w-4 h-4 text-yellow-500" />
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs">
          <span className="text-muted-foreground">
            {match.status === "finished" || match.status === "forfeit"
              ? `${match.playerAScore ?? 0} – ${match.playerBScore ?? 0}`
              : t("scorePending")}
          </span>
          {match.status === "finished" ? (
            <Badge variant="default" className="text-xs">
              {t("finished")}
            </Badge>
          ) : match.status === "forfeit" ? (
            <Badge variant="destructive" className="text-xs">
              Forfait
            </Badge>
          ) : match.status === "in_progress" ? (
            <Badge variant="secondary" className="text-xs">
              {t("inProgress")}
            </Badge>
          ) : match.playerA && match.playerB ? (
            <Badge variant="outline" className="text-xs">
              {t("scheduled")}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              {t("upcoming")}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EliminationBracket({
  bracket,
  onMatchClick,
  interactive = true,
}: EliminationBracketProps) {
  const t = useTranslations("EliminationBracket");
  if (!bracket || bracket.rounds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="bracket-container overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max">
        {bracket.rounds.map((round, roundIndex) => (
          <div key={round.index} className="bracket-round shrink-0">
            <div className="text-center mb-4">
              <h3 className="font-semibold text-lg">
                {round.index === bracket.totalRounds
                  ? "Finale"
                  : round.index === bracket.totalRounds - 1
                    ? "Demi-finales"
                    : round.index === bracket.totalRounds - 2
                      ? t("quarterFinals")
                      : `Round ${round.index}`}
              </h3>
              <Badge variant="outline" className="mt-1">
                {round.matches.length} match
                {round.matches.length > 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="space-y-6">
              {round.matches.map((match) => (
                <div
                  key={`${round.index}-${match.position}`}
                  className="relative"
                >
                  <BracketMatchComponent
                    match={match}
                    onClick={onMatchClick}
                    interactive={interactive}
                  />

                  {roundIndex < bracket.rounds.length - 1 && (
                    <div className="absolute top-1/2 -right-4 h-px w-8 -translate-y-1/2 bg-border">
                      <div className="absolute right-0 top-1/2 h-2 w-2 translate-x-1/2 -translate-y-1/2 rounded-full bg-border" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Légende */}
      <div className="mt-8 flex justify-center">
        <Card className="w-auto">
          <CardContent className="p-4">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded border border-emerald-500/40 bg-emerald-500/10" />
                <span>{t("winner")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded border border-primary/60 bg-primary/5" />
                <span>{t("inProgress")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded border border-border bg-card" />
                <span>{t("scheduledOrUpcoming")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
