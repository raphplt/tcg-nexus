"use client";

import { useTranslations } from "next-intl";
import { ArrowDownRight, Crown, Medal, Target, Trophy } from "lucide-react";
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BracketMatch } from "@/types/tournament";

export interface BracketMatchCardProps {
  match: BracketMatch;
  onClick?: (matchId: number) => void;
  interactive?: boolean;
  /** Where the loser of this match lands, for double elimination brackets. */
  dropHint?: string;
}

function getPhaseIcon(phase: string) {
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
}

/**
 * Single match of a bracket: both slots, the score and the current state.
 *
 * Shared by the single and double elimination views so that a match reads the
 * same way whichever branch it belongs to.
 */
export function BracketMatchCard({
  match,
  onClick,
  interactive = true,
  dropHint,
}: BracketMatchCardProps) {
  const t = useTranslations("EliminationBracket");

  const getStatusColor = () => {
    if (["finished", "forfeit"].includes(match.status ?? "")) {
      return "border-emerald-500/40 bg-emerald-500/5";
    }
    if (match.status === "in_progress") {
      return "border-primary/60 bg-primary/5";
    }
    return "border-border bg-card";
  };

  const isWinner = (playerId?: number) => match.winnerId === playerId;

  const renderSlot = (player: BracketMatch["playerA"]) => (
    <div
      className={`flex items-center gap-2 p-2 rounded ${
        isWinner(player?.id)
          ? "border border-emerald-500/40 bg-emerald-500/10"
          : "bg-muted/40"
      }`}
    >
      <Avatar className="w-6 h-6">
        <AvatarFallback className="text-xs">
          {player?.name?.[0] || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {player?.name || t("toBeDetermined")}
        </p>
        {player?.seed && (
          <p className="text-xs text-muted-foreground">Seed {player.seed}</p>
        )}
      </div>
      {isWinner(player?.id) && <Crown className="w-4 h-4 text-yellow-500" />}
    </div>
  );

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

        <div className="space-y-2">
          {renderSlot(match.playerA)}

          <div className="text-center">
            <span className="text-xs font-bold text-muted-foreground">VS</span>
          </div>

          {renderSlot(match.playerB)}
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs">
          <span className="text-muted-foreground">
            {match.status === "finished" || match.status === "forfeit"
              ? `${match.playerAScore ?? 0} – ${match.playerBScore ?? 0}`
              : t("scorePending")}
          </span>
          {match.isBye ? (
            <Badge variant="secondary" className="text-xs">
              Bye
            </Badge>
          ) : match.status === "finished" ? (
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

        {dropHint && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowDownRight className="h-3 w-3 text-amber-500" />
            <span className="truncate">{dropHint}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
