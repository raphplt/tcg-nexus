"use client";

import { useTranslations } from "next-intl";
import { ArrowDownRight, Crown, Swords, Trophy } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BracketMatch,
  BracketSide,
  BracketStructure,
} from "@/types/tournament";
import { BracketLegend } from "./BracketLegend";
import { BracketMatchCard } from "./BracketMatchCard";

interface DoubleEliminationBracketProps {
  bracket: BracketStructure;
  onMatchClick?: (matchId: number) => void;
  interactive?: boolean;
}

interface BranchColumn {
  /** Global step of the tournament, shared by both branches. */
  round: number;
  /** Index of the round inside its own branch, for the column heading. */
  sideRound: number;
  matches: BracketMatch[];
}

/**
 * Groups the matches of one branch into columns, in playing order.
 */
function columnsOf(
  bracket: BracketStructure,
  side: BracketSide,
): BranchColumn[] {
  const byRound = new Map<number, BracketMatch[]>();

  for (const round of bracket.rounds) {
    for (const match of round.matches) {
      if (match.bracketSide !== side) continue;
      byRound.set(round.index, [...(byRound.get(round.index) ?? []), match]);
    }
  }

  return [...byRound.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, matches], index) => ({
      round,
      sideRound: index + 1,
      matches: [...matches].sort((a, b) => a.position - b.position),
    }));
}

function Branch({
  columns,
  title,
  subtitle,
  icon,
  accent,
  dropHintOf,
  onMatchClick,
  interactive,
}: {
  columns: BranchColumn[];
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  dropHintOf?: (match: BracketMatch) => string | undefined;
  onMatchClick?: (matchId: number) => void;
  interactive: boolean;
}) {
  if (columns.length === 0) return null;

  return (
    <section>
      <div className={`mb-4 flex items-center gap-2 border-l-4 pl-3 ${accent}`}>
        {icon}
        <div>
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max">
          {columns.map((column) => (
            <div key={`${title}-${column.round}`} className="shrink-0">
              <div className="text-center mb-4">
                <h3 className="font-medium">Ronde {column.sideRound}</h3>
                <Badge variant="outline" className="mt-1">
                  Étape {column.round}
                </Badge>
              </div>

              <div className="space-y-6">
                {column.matches.map((match) => (
                  <BracketMatchCard
                    key={match.matchId ?? `${column.round}-${match.position}`}
                    match={match}
                    onClick={onMatchClick}
                    interactive={interactive}
                    dropHint={dropHintOf?.(match)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Double elimination view: the winners branch, the losers branch that catches
 * every first defeat, and the grand final where the two survivors meet.
 */
export function DoubleEliminationBracket({
  bracket,
  onMatchClick,
  interactive = true,
}: DoubleEliminationBracketProps) {
  const t = useTranslations("EliminationBracket");

  if (!bracket || bracket.rounds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  const winners = columnsOf(bracket, "winners");
  const losers = columnsOf(bracket, "losers");
  const grandFinals = bracket.rounds
    .flatMap((round) => round.matches)
    .filter((match) => match.bracketSide === "grand_final")
    .sort((a, b) => a.round - b.round);

  // Where each losers bracket match sits, so a defeat can be traced visually.
  const losersRoundByMatchId = new Map<number, number>();
  for (const column of losers) {
    for (const match of column.matches) {
      if (match.matchId) {
        losersRoundByMatchId.set(match.matchId, column.sideRound);
      }
    }
  }

  const dropHintOf = (match: BracketMatch): string | undefined => {
    if (!match.loserNextMatchId) return undefined;
    const targetRound = losersRoundByMatchId.get(match.loserNextMatchId);
    return targetRound
      ? `Perdant → repêchage ronde ${targetRound}`
      : "Perdant → grande finale";
  };

  return (
    <div className="space-y-10">
      <Branch
        columns={winners}
        title="Tableau principal"
        subtitle="Une défaite renvoie au repêchage"
        icon={<Trophy className="h-5 w-5 text-emerald-500" />}
        accent="border-emerald-500/60"
        dropHintOf={dropHintOf}
        onMatchClick={onMatchClick}
        interactive={interactive}
      />

      <Branch
        columns={losers}
        title="Repêchage"
        subtitle="Deuxième défaite : élimination"
        icon={<Swords className="h-5 w-5 text-amber-500" />}
        accent="border-amber-500/60"
        onMatchClick={onMatchClick}
        interactive={interactive}
      />

      {grandFinals.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2 border-l-4 border-yellow-500/60 pl-3">
            <Crown className="h-5 w-5 text-yellow-500" />
            <div>
              <h2 className="text-lg font-semibold leading-tight">
                Grande finale
              </h2>
              <p className="text-sm text-muted-foreground">
                {grandFinals.length > 1
                  ? "Le finaliste issu du repêchage a égalisé : la belle départage"
                  : "Le finaliste issu du repêchage doit gagner deux fois"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-8">
            {grandFinals.map((match, index) => (
              <div key={match.matchId ?? index}>
                {index > 0 && (
                  <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowDownRight className="h-3 w-3 text-yellow-500" />
                    <span>Belle</span>
                  </div>
                )}
                <BracketMatchCard
                  match={match}
                  onClick={onMatchClick}
                  interactive={interactive}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-center">
        <Card className="w-auto">
          <CardContent className="p-4">
            <BracketLegend />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
