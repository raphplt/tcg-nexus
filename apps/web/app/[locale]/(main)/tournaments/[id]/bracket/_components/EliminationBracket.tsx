"use client";

import { useTranslations } from "next-intl";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BracketStructure } from "@/types/tournament";
import { BracketMatchCard } from "./BracketMatchCard";
import { BracketLegend } from "./BracketLegend";

interface EliminationBracketProps {
  bracket: BracketStructure;
  onMatchClick?: (matchId: number) => void;
  interactive?: boolean;
}

/**
 * Single elimination view: one column per round, losers leave the tournament.
 */
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
                  <BracketMatchCard
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

      <div className="mt-8 flex justify-center">
        <Card className="w-auto">
          <CardContent className="p-4">
            <BracketLegend />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
