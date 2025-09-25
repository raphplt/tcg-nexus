"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Crown, Medal, Target } from "lucide-react";
import { BracketStructure, BracketMatch } from "@/types/tournament";

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
    if (match.winnerId) return "border-green-200 bg-green-50";
    if (match.playerA && match.playerB) return "border-blue-200 bg-blue-50";
    return "border-gray-200 bg-gray-50";
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
            <Badge
              variant="outline"
              className="text-xs"
            >
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
                ? "bg-green-100 border border-green-300"
                : "bg-white"
            }`}
          >
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">
                {match.playerA?.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {match.playerA?.name || "À déterminer"}
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
                ? "bg-green-100 border border-green-300"
                : "bg-white"
            }`}
          >
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">
                {match.playerB?.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {match.playerB?.name || "À déterminer"}
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

        {/* Status */}
        <div className="mt-2 text-center">
          {match.winnerId ? (
            <Badge
              variant="default"
              className="text-xs"
            >
              Terminé
            </Badge>
          ) : match.playerA && match.playerB ? (
            <Badge
              variant="secondary"
              className="text-xs"
            >
              En attente
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-xs"
            >
              À venir
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
  if (!bracket || bracket.rounds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun bracket disponible</p>
      </div>
    );
  }

  return (
    <div className="bracket-container overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max">
        {bracket.rounds.map((round, roundIndex) => (
          <div
            key={round.index}
            className="bracket-round flex-shrink-0"
          >
            {/* Header du round */}
            <div className="text-center mb-4">
              <h3 className="font-semibold text-lg">
                {round.index === bracket.totalRounds
                  ? "Finale"
                  : round.index === bracket.totalRounds - 1
                    ? "Demi-finales"
                    : round.index === bracket.totalRounds - 2
                      ? "Quarts de finale"
                      : `Round ${round.index}`}
              </h3>
              <Badge
                variant="outline"
                className="mt-1"
              >
                {round.matches.length} match
                {round.matches.length > 1 ? "es" : ""}
              </Badge>
            </div>

            {/* Matches du round */}
            <div className="space-y-6">
              {round.matches.map((match, matchIndex) => (
                <div
                  key={`${round.index}-${match.position}`}
                  className="relative"
                >
                  <BracketMatchComponent
                    match={match}
                    onClick={onMatchClick}
                    interactive={interactive}
                  />

                  {/* Connexions vers le match suivant */}
                  {roundIndex < bracket.rounds.length - 1 && (
                    <div className="absolute top-1/2 -right-4 w-8 h-px bg-gray-300 transform -translate-y-1/2">
                      <div className="absolute right-0 top-1/2 w-2 h-2 bg-gray-300 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
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
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span>Vainqueur</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
                <span>En attente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></div>
                <span>À venir</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
