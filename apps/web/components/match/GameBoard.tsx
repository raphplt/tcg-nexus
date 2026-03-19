"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MatchBoardActionInput,
  MatchPromptResponseInput,
} from "@/components/match/MatchBoardView";
import { VisualMatchBoardView } from "@/components/match/board/VisualMatchBoardView";
import { matchOnlineService } from "@/services/match-online.service";
import { useMatchStore } from "@/store/useMatchStore";
import {
  OnlineMatchSessionView,
  SanitizedGameState,
} from "@/types/match-online";
import { extractApiErrorMessage } from "@/utils/api-error";
import { API_BASE_URL } from "@/utils/fetch";

interface GameBoardProps {
  matchId: number;
}

export default function GameBoard({ matchId }: GameBoardProps) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const {
    sessionView,
    gameState,
    recentEvents,
    isConnected,
    lastError,
    setConnectionStatus,
    setSessionView,
    setGameState,
    appendRealtimeEvents,
    setError,
    reset,
  } = useMatchStore();

  const sessionQuery = useQuery({
    queryKey: ["match-online-session", matchId],
    queryFn: () => matchOnlineService.getSession(matchId),
    refetchInterval: (query) =>
      query.state.data?.status === "WAITING_FOR_DECKS" ? 5000 : false,
  });

  const eligibilityQuery = useQuery({
    queryKey: ["match-online-deck-eligibility", matchId],
    queryFn: () => matchOnlineService.getDeckEligibility(matchId),
  });

  const selectDeckMutation = useMutation({
    mutationFn: (deckId: number) =>
      matchOnlineService.createOrUpdateSession(matchId, deckId),
    onSuccess: (nextSession) => {
      setSessionView(nextSession);
      setError(null);
      queryClient.setQueryData(["match-online-session", matchId], nextSession);
      void queryClient.invalidateQueries({
        queryKey: ["match-online-deck-eligibility", matchId],
      });
    },
    onError: (error: unknown) => {
      setError(
        extractApiErrorMessage(error, "Impossible de sélectionner ce deck."),
      );
    },
  });

  useEffect(() => {
    return () => reset();
  }, [reset]);

  useEffect(() => {
    if (sessionQuery.data) {
      setSessionView(sessionQuery.data);
      setError(null);
    }
  }, [sessionQuery.data, setError, setSessionView]);

  const socketBaseUrl = useMemo(() => {
    if (API_BASE_URL.startsWith("http")) {
      return API_BASE_URL;
    }

    if (typeof window === "undefined") {
      return "";
    }

    return new URL(API_BASE_URL, window.location.origin).toString();
  }, []);

  useEffect(() => {
    const activeSession =
      sessionQuery.data?.status === "ACTIVE" ||
      sessionQuery.data?.status === "FINISHED";

    if (!activeSession || !socketBaseUrl) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnectionStatus(false);
      return;
    }

    const socket = io(`${socketBaseUrl}/match`, {
      transports: ["websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus(true);
      socket.emit("join_match", { matchId });
    });

    socket.on("disconnect", () => {
      setConnectionStatus(false);
    });

    socket.on("session_view", (view: OnlineMatchSessionView) => {
      setSessionView(view);
      queryClient.setQueryData(["match-online-session", matchId], view);
    });

    socket.on("state_update", (nextGameState: SanitizedGameState | null) => {
      setGameState(nextGameState);
    });

    socket.on("game_events", (events: Record<string, unknown>[]) => {
      appendRealtimeEvents(events);
    });

    socket.on("action_rejected", (payload: { message: string }) => {
      setError(payload.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnectionStatus(false);
    };
  }, [
    appendRealtimeEvents,
    matchId,
    queryClient,
    sessionQuery.data?.status,
    setConnectionStatus,
    setError,
    setGameState,
    setSessionView,
    socketBaseUrl,
  ]);

  const liveSession = sessionView || sessionQuery.data || null;
  const liveGameState = gameState || liveSession?.gameState || null;
  const enginePlayerId = liveSession?.enginePlayerId || null;
  const recentLog = recentEvents.length
    ? recentEvents
    : liveSession?.recentLog || [];

  if (sessionQuery.isLoading || eligibilityQuery.isLoading) {
    return (
      <Card className="tcg-surface">
        <CardContent className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de la session online...
        </CardContent>
      </Card>
    );
  }

  if (sessionQuery.error || eligibilityQuery.error || !liveSession) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex items-center gap-3 py-8 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Impossible de charger la session online.
        </CardContent>
      </Card>
    );
  }

  const emitAction = (action: MatchBoardActionInput) => {
    if (!socketRef.current || !enginePlayerId) {
      setError("La connexion temps réel n'est pas encore prête.");
      return;
    }

    setError(null);
    socketRef.current.emit("dispatch_action", {
      matchId,
      action: {
        ...action,
        playerId: enginePlayerId,
      },
    });
  };

  const emitPromptResponse = (response: MatchPromptResponseInput) => {
    if (!socketRef.current) {
      setError("La connexion temps réel n'est pas encore prête.");
      return;
    }

    setError(null);
    socketRef.current.emit("respond_prompt", {
      matchId,
      response,
    });
  };

  const renderDeckSelection = () => (
    <Card className="tcg-surface">
      <CardHeader>
        <CardTitle>Choix du deck online</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(eligibilityQuery.data?.eligibleDecks || []).map((deck) => (
          <div key={deck.deckId} className="tcg-note-card space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">{deck.deckName}</div>
                <div className="text-xs text-muted-foreground">
                  {deck.totalCards} cartes
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={deck.eligible ? "default" : "destructive"}>
                  {deck.eligible ? "Éligible" : "Bloqué"}
                </Badge>
                <Button
                  size="sm"
                  disabled={!deck.eligible || selectDeckMutation.isPending}
                  onClick={() => selectDeckMutation.mutate(deck.deckId)}
                >
                  Utiliser
                </Button>
              </div>
            </div>
            {!deck.eligible ? (
              <div className="space-y-1 text-xs text-destructive">
                {deck.reasons.map((reason, index) => (
                  <div key={`${deck.deckId}-${reason.code}-${index}`}>
                    {reason.message}
                    {reason.cardName ? ` : ${reason.cardName}` : ""}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );

  if (!liveSession.selectedDeckId) {
    return renderDeckSelection();
  }

  if (liveSession.status === "WAITING_FOR_DECKS") {
    return (
      <Card className="tcg-surface">
        <CardHeader>
          <CardTitle>Session online en attente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Votre deck est sélectionné. La partie commencera dès que
            l’adversaire aura choisi le sien.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Deck #{liveSession.selectedDeckId}</Badge>
            <Badge
              variant={liveSession.opponentDeckReady ? "default" : "secondary"}
            >
              {liveSession.opponentDeckReady
                ? "Deck adverse prêt"
                : "En attente du deck adverse"}
            </Badge>
          </div>
          {renderDeckSelection()}
        </CardContent>
      </Card>
    );
  }

  return (
    <VisualMatchBoardView
      sessionStatus={liveSession.status}
      gameState={liveGameState}
      enginePlayerId={enginePlayerId}
      recentLog={recentLog}
      lastError={lastError}
      headerAside={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-emerald-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-amber-500" />
          )}
          {isConnected ? "Temps réel connecté" : "Reconnexion..."}
        </div>
      }
      onDispatchAction={emitAction}
      onRespondPrompt={emitPromptResponse}
    />
  );
}

