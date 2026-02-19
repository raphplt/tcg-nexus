"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trophy, Edit, Crown, User } from "lucide-react";
import { Match } from "@/types/tournament";
import { cn } from "@/lib/utils";

interface TournamentBracketProps {
  matches: Match[];
  isAdmin?: boolean;
  onUpdateScore?: (
    matchId: number,
    scoreA: number,
    scoreB: number,
  ) => Promise<void>;
}

const getPlayerName = (player: any): string => {
  if (!player) return "TBD";
  if (player.user) {
    return `${player.user.firstName} ${player.user.lastName}`;
  }
  return player.name || `Joueur #${player.id}`;
};

const getRoundName = (round: number, totalRounds: number): string => {
  const roundsFromEnd = totalRounds - round + 1;
  switch (roundsFromEnd) {
    case 1:
      return "Finale";
    case 2:
      return "Demi-finales";
    case 3:
      return "Quarts de finale";
    case 4:
      return "Huitièmes de finale";
    default:
      return `Round ${round}`;
  }
};

function MatchCard({
  match,
  isAdmin,
  onEdit,
}: {
  match: Match;
  isAdmin?: boolean;
  onEdit?: () => void;
}) {
  const isFinished = match.status === "finished";
  const isInProgress = match.status === "in_progress";
  const playerAWins =
    isFinished && (match.playerAScore ?? 0) > (match.playerBScore ?? 0);
  const playerBWins =
    isFinished && (match.playerBScore ?? 0) > (match.playerAScore ?? 0);

  return (
    <Card
      className={cn(
        "w-56 transition-all duration-200 hover:shadow-md",
        isInProgress && "ring-2 ring-yellow-500",
        isFinished && "opacity-90",
      )}
    >
      <CardContent className="p-0">
        {/* Player A */}
        <div
          className={cn(
            "flex items-center justify-between p-2 border-b",
            playerAWins && "bg-green-50 dark:bg-green-950/30",
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {playerAWins && (
              <Crown className="size-3 text-yellow-500 shrink-0" />
            )}
            {!match.playerA && (
              <User className="size-3 text-muted-foreground shrink-0" />
            )}
            <span
              className={cn(
                "text-sm truncate",
                playerAWins &&
                  "font-semibold text-green-700 dark:text-green-400",
                !match.playerA && "text-muted-foreground italic",
              )}
            >
              {getPlayerName(match.playerA)}
            </span>
          </div>
          <Badge
            variant={playerAWins ? "default" : "outline"}
            className={cn(
              "ml-2 min-w-6 justify-center",
              playerAWins && "bg-green-600",
            )}
          >
            {match.playerAScore ?? 0}
          </Badge>
        </div>

        {/* Player B */}
        <div
          className={cn(
            "flex items-center justify-between p-2",
            playerBWins && "bg-green-50 dark:bg-green-950/30",
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {playerBWins && (
              <Crown className="size-3 text-yellow-500 shrink-0" />
            )}
            {!match.playerB && (
              <User className="size-3 text-muted-foreground shrink-0" />
            )}
            <span
              className={cn(
                "text-sm truncate",
                playerBWins &&
                  "font-semibold text-green-700 dark:text-green-400",
                !match.playerB && "text-muted-foreground italic",
              )}
            >
              {getPlayerName(match.playerB)}
            </span>
          </div>
          <Badge
            variant={playerBWins ? "default" : "outline"}
            className={cn(
              "ml-2 min-w-6 justify-center",
              playerBWins && "bg-green-600",
            )}
          >
            {match.playerBScore ?? 0}
          </Badge>
        </div>

        {/* Admin Actions */}
        {isAdmin && match.playerA && match.playerB && !isFinished && (
          <div className="p-2 border-t bg-muted/30">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={onEdit}
            >
              <Edit className="size-3 mr-1" />
              Entrer le score
            </Button>
          </div>
        )}

        {/* Match status */}
        <div className="px-2 py-1 bg-muted/50 text-center">
          <span className="text-xs text-muted-foreground">
            Match #{match.id}
            {isInProgress && (
              <Badge
                variant="outline"
                className="ml-2 text-xs bg-yellow-100 text-yellow-700 border-yellow-300"
              >
                En cours
              </Badge>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function TournamentBracket({
  matches,
  isAdmin = false,
  onUpdateScore,
}: TournamentBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Organiser les matches par round
  const matchesByRound = useMemo(() => {
    const grouped = new Map<number, Match[]>();
    matches.forEach((match) => {
      const roundMatches = grouped.get(match.round) || [];
      roundMatches.push(match);
      grouped.set(match.round, roundMatches);
    });
    // Trier par round
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, roundMatches]) => ({
        round,
        matches: roundMatches.sort((a, b) => a.id - b.id),
      }));
  }, [matches]);

  const totalRounds = matchesByRound.length;

  const handleEditMatch = (match: Match) => {
    setSelectedMatch(match);
    setScoreA(match.playerAScore ?? 0);
    setScoreB(match.playerBScore ?? 0);
  };

  const handleSaveScore = async () => {
    if (!selectedMatch || !onUpdateScore) return;

    setIsSubmitting(true);
    try {
      await onUpdateScore(selectedMatch.id, scoreA, scoreB);
      setSelectedMatch(null);
    } catch (error) {
      console.error("Failed to update score:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <Trophy className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Aucun match</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Les matches seront générés lorsque le tournoi sera démarré.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Déterminer le vainqueur seulement si :
  // 1. Tous les matches sont terminés
  // 2. Le dernier round n'a qu'un seul match (la finale)
  const allMatchesFinished = matches.every((m) => m.status === "finished");
  const lastRound = matchesByRound[matchesByRound.length - 1];
  const isFinalRound = lastRound?.matches.length === 1;
  const finalMatch = lastRound?.matches[0];

  const winner =
    allMatchesFinished && isFinalRound && finalMatch?.status === "finished"
      ? (finalMatch.playerAScore ?? 0) > (finalMatch.playerBScore ?? 0)
        ? finalMatch.playerA
        : finalMatch.playerB
      : null;

  return (
    <div className="space-y-6">
      {winner && (
        <Card className="bg-linear-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30">
          <CardContent className="flex items-center justify-center gap-3 py-4">
            <Trophy className="size-8 text-yellow-500" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Vainqueur</p>
              <p className="text-xl font-bold">{getPlayerName(winner)}</p>
            </div>
            <Trophy className="size-8 text-yellow-500" />
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max p-4">
          {matchesByRound.map(({ round, matches: roundMatches }) => (
            <div
              key={round}
              className="flex flex-col"
            >
              <div className="text-center mb-4">
                <Badge
                  variant="secondary"
                  className="text-sm font-medium"
                >
                  {getRoundName(round, totalRounds)}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {roundMatches.length} match
                  {roundMatches.length > 1 ? "es" : ""}
                </p>
              </div>

              <div
                className="flex flex-col justify-around flex-1 gap-4"
                style={{
                  minHeight: `${roundMatches.length * 140}px`,
                }}
              >
                {roundMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center"
                  >
                    <MatchCard
                      match={match}
                      isAdmin={isAdmin}
                      onEdit={() => handleEditMatch(match)}
                    />
                    {round < totalRounds && (
                      <div className="w-8 h-px bg-border" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={!!selectedMatch}
        onOpenChange={(open) => !open && setSelectedMatch(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrer le score</DialogTitle>
            <DialogDescription>
              Match #{selectedMatch?.id} - Round {selectedMatch?.round}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 items-center py-4">
            <div className="text-center space-y-2">
              <Label className="text-sm text-muted-foreground">Joueur A</Label>
              <p className="font-medium text-sm">
                {getPlayerName(selectedMatch?.playerA)}
              </p>
              <Input
                type="number"
                min={0}
                value={scoreA}
                onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                className="text-center text-2xl font-bold h-14"
              />
            </div>

            <div className="text-center text-3xl font-bold text-muted-foreground">
              VS
            </div>

            <div className="text-center space-y-2">
              <Label className="text-sm text-muted-foreground">Joueur B</Label>
              <p className="font-medium text-sm">
                {getPlayerName(selectedMatch?.playerB)}
              </p>
              <Input
                type="number"
                min={0}
                value={scoreB}
                onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                className="text-center text-2xl font-bold h-14"
              />
            </div>
          </div>

          {scoreA === scoreB && (
            <p className="text-sm text-amber-600 text-center">
              ⚠️ Score égalité - le match ne sera pas marqué comme terminé
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedMatch(null)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveScore}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
