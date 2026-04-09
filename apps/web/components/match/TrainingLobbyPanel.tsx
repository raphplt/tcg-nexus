"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bot, Loader2, Sparkles, Swords } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trainingMatchService } from "@/services/training-match.service";
import {
  TrainingDifficulty,
  TrainingLobbyView,
  TrainingSessionSummary,
} from "@/types/training-match";
import { extractApiErrorMessage } from "@/utils/api-error";

const difficultyLabels: Record<TrainingDifficulty, string> = {
  easy: "Facile",
  standard: "Standard",
};

export function TrainingLobbyPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<TrainingDifficulty>("standard");
  const [lastError, setLastError] = useState<string | null>(null);

  const lobbyQuery = useQuery<TrainingLobbyView>({
    queryKey: ["training-matches", "lobby"],
    queryFn: () => trainingMatchService.getLobby(),
  });

  const eligibleDecks = useMemo(
    () =>
      (lobbyQuery.data?.availableDecks || []).filter((deck) => deck.eligible),
    [lobbyQuery.data?.availableDecks],
  );

  const blockedDecks = useMemo(
    () =>
      (lobbyQuery.data?.availableDecks || []).filter((deck) => !deck.eligible),
    [lobbyQuery.data?.availableDecks],
  );

  useEffect(() => {
    if (!selectedDeckId && eligibleDecks.length > 0) {
      setSelectedDeckId(eligibleDecks[0].deckId);
    }
  }, [eligibleDecks, selectedDeckId]);

  useEffect(() => {
    if (!selectedPresetId && lobbyQuery.data?.aiDeckPresets.length) {
      setSelectedPresetId(lobbyQuery.data.aiDeckPresets[0].id);
    }
  }, [lobbyQuery.data?.aiDeckPresets, selectedPresetId]);

  useEffect(() => {
    if (
      lobbyQuery.data?.difficulties.length &&
      !lobbyQuery.data.difficulties.includes(selectedDifficulty)
    ) {
      setSelectedDifficulty(lobbyQuery.data.difficulties[0]);
    }
  }, [lobbyQuery.data?.difficulties, selectedDifficulty]);

  const createSessionMutation = useMutation({
    mutationFn: () => {
      if (!selectedDeckId || !selectedPresetId) {
        throw new Error("Sélection incomplète");
      }

      return trainingMatchService.createSession({
        deckId: selectedDeckId,
        aiDeckPresetId: selectedPresetId,
        difficulty: selectedDifficulty,
      });
    },
    onSuccess: (session) => {
      setLastError(null);
      queryClient.setQueryData(
        ["training-matches", session.sessionId],
        session,
      );
      void queryClient.invalidateQueries({
        queryKey: ["training-matches", "lobby"],
      });
      router.push(`/play/training/${session.sessionId}`);
    },
    onError: (error: unknown) => {
      setLastError(
        extractApiErrorMessage(
          error,
          "Impossible de lancer ce match d’entraînement.",
        ),
      );
    },
  });

  if (lobbyQuery.isLoading) {
    return (
      <Card id="training-ai" className="tcg-surface tcg-surface--highlight">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de l’entraînement IA...
        </CardContent>
      </Card>
    );
  }

  if (lobbyQuery.error || !lobbyQuery.data) {
    return (
      <Card id="training-ai" className="border-destructive/40">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-destructive">
            {extractApiErrorMessage(
              lobbyQuery.error,
              "Impossible de charger le mode entraînement.",
            )}
          </p>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => void lobbyQuery.refetch()}
          >
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="training-ai" className="tcg-surface tcg-surface--highlight">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit rounded-full border-0 bg-primary/10 text-primary hover:bg-primary/10">
              Entraînement vs IA
            </Badge>
            <Badge variant="secondary">BO1</Badge>
            <Badge variant="outline">Reprise incluse</Badge>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold leading-tight">
              Lancez une partie d’entraînement à la demande.
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Choisissez un deck compatible, un preset IA et une difficulté. La
              partie démarre immédiatement, sans tournoi ni classement.
            </p>
          </div>
        </div>

        {lastError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {lastError}
          </div>
        ) : null}

        {eligibleDecks.length ? (
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Deck joueur
                </p>
                <Select
                  value={selectedDeckId?.toString()}
                  onValueChange={(value) => setSelectedDeckId(Number(value))}
                >
                  <SelectTrigger className="w-full rounded-2xl bg-white">
                    <SelectValue placeholder="Choisir un deck" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleDecks.map((deck) => (
                      <SelectItem key={deck.deckId} value={String(deck.deckId)}>
                        {deck.deckName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Deck IA
                </p>
                <Select
                  value={selectedPresetId}
                  onValueChange={setSelectedPresetId}
                >
                  <SelectTrigger className="w-full rounded-2xl bg-white">
                    <SelectValue placeholder="Choisir un preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {lobbyQuery.data.aiDeckPresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Difficulté
                </p>
                <Select
                  value={selectedDifficulty}
                  onValueChange={(value) =>
                    setSelectedDifficulty(value as TrainingDifficulty)
                  }
                >
                  <SelectTrigger className="w-full rounded-2xl bg-white">
                    <SelectValue placeholder="Choisir un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {lobbyQuery.data.difficulties.map((difficulty) => (
                      <SelectItem key={difficulty} value={difficulty}>
                        {difficultyLabels[difficulty]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full rounded-full"
              disabled={
                createSessionMutation.isPending ||
                !selectedDeckId ||
                !selectedPresetId
              }
              onClick={() => createSessionMutation.mutate()}
            >
              {createSessionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création du match...
                </>
              ) : (
                <>
                  Lancer un match d’entraînement
                  <Swords className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="tcg-empty-state space-y-4 px-5 py-6">
            <div className="space-y-2">
              <p className="text-base font-semibold text-slate-950">
                Aucun deck compatible trouvé.
              </p>
              <p className="text-sm leading-6 text-slate-600">
                Le mode entraînement utilise la même whitelist que le jeu en
                ligne. Il vous faut donc un deck entièrement supporté.
              </p>
            </div>
            <Button asChild className="rounded-full">
              <Link href="/decks/me">
                Ouvrir mes decks
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {lobbyQuery.data.aiDeckPresets.map((preset) => (
            <div
              key={preset.id}
              className="tcg-note-card flex items-start gap-3 p-4"
            >
              <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-950">{preset.name}</p>
                <p className="text-sm text-slate-500">
                  {preset.cardCount} cartes supportées pour le MVP.
                </p>
              </div>
            </div>
          ))}
        </div>

        {blockedDecks.length ? (
          <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white/80 p-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-900">
                Decks bloqués pour l’instant
              </p>
            </div>
            <div className="space-y-3">
              {blockedDecks.slice(0, 3).map((deck) => (
                <div key={deck.deckId} className="space-y-1">
                  <p className="text-sm font-medium text-slate-900">
                    {deck.deckName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {deck.reasons[0]?.message || "Deck non supporté."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Sessions actives
              </p>
              <h3 className="mt-1 text-xl font-bold">Reprendre une partie</h3>
            </div>
            <Badge variant="outline">
              {lobbyQuery.data.activeSessions.length} ouverte
              {lobbyQuery.data.activeSessions.length > 1 ? "s" : ""}
            </Badge>
          </div>

          {lobbyQuery.data.activeSessions.length ? (
            <div className="space-y-3">
              {lobbyQuery.data.activeSessions.map((session) => (
                <TrainingSessionCard
                  key={session.sessionId}
                  session={session}
                />
              ))}
            </div>
          ) : (
            <div className="tcg-empty-state px-5 py-6 text-sm text-slate-500">
              Aucune session en cours. Lancez un nouveau match pour vous
              entraîner.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TrainingSessionCard({ session }: { session: TrainingSessionSummary }) {
  return (
    <div className="tcg-note-card space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-slate-950">
            {session.aiDeckPresetName}
          </p>
          <p className="text-sm text-slate-500">
            Difficulté {difficultyLabels[session.aiDifficulty]} • Tour{" "}
            {session.turnNumber}
          </p>
        </div>
        <Badge variant={session.awaitingPlayerAction ? "default" : "secondary"}>
          {session.awaitingPlayerAction ? "À vous de jouer" : "Tour de l’IA"}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>Mise à jour {formatTrainingDate(session.updatedAt)}</span>
        <Button asChild variant="outline" className="rounded-full">
          <Link href={`/play/training/${session.sessionId}`}>
            Reprendre
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function formatTrainingDate(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
