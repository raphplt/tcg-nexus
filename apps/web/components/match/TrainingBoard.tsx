"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { VisualMatchBoardView } from "@/components/match/board/VisualMatchBoardView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrainingActionInput,
  TrainingPromptResponseInput,
  trainingMatchService,
} from "@/services/training-match.service";
import {
  TrainingDifficulty,
  TrainingSessionView,
} from "@/types/training-match";
import { extractApiErrorMessage } from "@/utils/api-error";

interface TrainingBoardProps {
  sessionId: number;
}

const difficultyLabels: Record<TrainingDifficulty, string> = {
  easy: "Facile",
  standard: "Standard",
};

export default function TrainingBoard({ sessionId }: TrainingBoardProps) {
  const queryClient = useQueryClient();
  const [lastError, setLastError] = useState<string | null>(null);

  const sessionQuery = useQuery({
    queryKey: ["training-matches", sessionId],
    queryFn: () => trainingMatchService.getSession(sessionId),
  });

  const syncSessionInCache = (session: TrainingSessionView) => {
    setLastError(null);
    queryClient.setQueryData(["training-matches", sessionId], session);
    void queryClient.invalidateQueries({
      queryKey: ["training-matches", "lobby"],
    });
  };

  const actionMutation = useMutation({
    mutationFn: (action: TrainingActionInput) =>
      trainingMatchService.dispatchAction(sessionId, action),
    onSuccess: (result) => {
      syncSessionInCache(result.session);
    },
    onError: (error: unknown) => {
      setLastError(
        extractApiErrorMessage(error, "Impossible de résoudre cette action."),
      );
    },
  });

  const promptMutation = useMutation({
    mutationFn: (response: TrainingPromptResponseInput) =>
      trainingMatchService.respondPrompt(sessionId, response),
    onSuccess: (result) => {
      syncSessionInCache(result.session);
    },
    onError: (error: unknown) => {
      setLastError(
        extractApiErrorMessage(error, "Impossible de valider cette réponse."),
      );
    },
  });

  const session = sessionQuery.data;
  const isBusy = actionMutation.isPending || promptMutation.isPending;

  if (sessionQuery.isLoading) {
    return (
      <Card className="tcg-surface">
        <CardContent className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du match d’entraînement...
        </CardContent>
      </Card>
    );
  }

  if (sessionQuery.error || !session) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-8 text-sm text-destructive">
          {extractApiErrorMessage(
            sessionQuery.error,
            "Impossible de charger ce match d’entraînement.",
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <VisualMatchBoardView
        sessionStatus={session.status}
        gameState={session.gameState}
        enginePlayerId={session.humanPlayerId}
        recentLog={session.recentLog}
        lastError={lastError}
        isBusy={isBusy}
        headerAside={
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">Mode synchrone</Badge>
            {isBusy ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                L’IA joue son tour...
              </span>
            ) : (
              <span>Prêt</span>
            )}
          </div>
        }
        introCard={
          <Card className="tcg-surface tcg-surface--soft">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Match d’entraînement
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge>{session.aiDeckPresetName}</Badge>
              <Badge variant="secondary">
                Difficulté {difficultyLabels[session.aiDifficulty]}
              </Badge>
              <Badge variant="outline">Session #{session.sessionId}</Badge>
            </CardContent>
          </Card>
        }
        footerCard={
          session.status === "FINISHED" ? (
            <Card className="tcg-surface tcg-surface--highlight">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Partie terminée</h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {session.winnerSide === "PLAYER"
                      ? "Vous avez remporté ce match d’entraînement."
                      : session.winnerSide === "AI"
                        ? "L’IA a remporté ce match d’entraînement."
                        : "Le match s’est terminé sans vainqueur déclaré."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="rounded-full">
                    <Link href="/play#training-ai">Nouvelle partie</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href="/play">Retour à /play</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null
        }
        onDispatchAction={(action) => actionMutation.mutate(action)}
        onRespondPrompt={(response) => promptMutation.mutate(response)}
        onForfeit={() => actionMutation.mutate({ type: "FORFEIT" })}
      />
  );
}
