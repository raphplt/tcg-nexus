"use client";

import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Users, Wifi, WifiOff } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MatchBoardActionInput,
  MatchPromptResponseInput,
} from "@/components/match/MatchBoardView";
import { VisualMatchBoardView } from "@/components/match/board/VisualMatchBoardView";
import { casualMatchService } from "@/services/casual-match.service";
import type { CasualSessionView } from "@/types/casual-match";
import type {
  OnlineMatchLogEntry,
  SanitizedGameState,
} from "@/types/match-online";
import { extractApiErrorMessage } from "@/utils/api-error";
import { API_BASE_URL } from "@/utils/fetch";

interface CasualGameBoardProps {
  sessionId: number;
}

export default function CasualGameBoard({ sessionId }: CasualGameBoardProps) {
  const t = useTranslations("CasualGame");
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [sessionView, setSessionView] = useState<CasualSessionView | null>(
    null,
  );
  const [gameState, setGameState] = useState<SanitizedGameState | null>(null);
  const [recentEvents, setRecentEvents] = useState<OnlineMatchLogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const sessionQuery = useQuery({
    queryKey: ["casual-matches", sessionId],
    queryFn: () => casualMatchService.getSession(sessionId),
    refetchInterval: (query) =>
      query.state.data?.status === "WAITING_FOR_DECKS" ? 5000 : false,
  });

  useEffect(() => {
    if (sessionQuery.data) {
      setSessionView(sessionQuery.data);
      setGameState(sessionQuery.data.gameState);
      setRecentEvents(sessionQuery.data.recentLog || []);
      setLastError(null);
    }
  }, [sessionQuery.data]);

  const socketBaseUrl = useMemo(() => {
    if (API_BASE_URL.startsWith("http")) return API_BASE_URL;
    if (typeof window === "undefined") return "";
    return new URL(API_BASE_URL, window.location.origin).toString();
  }, []);

  useEffect(() => {
    const activeSession =
      sessionQuery.data?.status === "ACTIVE" ||
      sessionQuery.data?.status === "FINISHED";

    if (!activeSession || !socketBaseUrl) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    const socket = io(`${socketBaseUrl}/match`, {
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("casual_join", { sessionId });
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("casual_session_view", (view: CasualSessionView) => {
      setSessionView(view);
      setGameState(view.gameState);
      queryClient.setQueryData(["casual-matches", sessionId], view);
    });

    socket.on("casual_state_update", (state: SanitizedGameState | null) => {
      setGameState(state);
    });

    socket.on("casual_game_events", (events: Record<string, unknown>[]) => {
      setRecentEvents((prev) =>
        [
          ...prev,
          ...events.map((payload, index) => ({
            id: `live-${Date.now()}-${index}`,
            kind: "EVENT" as const,
            timestamp: new Date().toISOString(),
            payload,
          })),
        ].slice(-100),
      );
    });

    socket.on("casual_action_rejected", (payload: { message: string }) => {
      setLastError(payload.message);
    });

    socket.on("opponent_disconnected", () => setOpponentDisconnected(true));
    socket.on("opponent_reconnected", () => setOpponentDisconnected(false));

    return () => {
      socket.emit("casual_leave", { sessionId });
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setOpponentDisconnected(false);
    };
  }, [sessionId, sessionQuery.data?.status, socketBaseUrl, queryClient]);

  const liveSession = sessionView || sessionQuery.data || null;
  const liveGameState = gameState || liveSession?.gameState || null;
  const enginePlayerId = liveSession?.enginePlayerId || null;
  const liveLog = recentEvents.length
    ? recentEvents
    : liveSession?.recentLog || [];

  if (sessionQuery.isLoading) {
    return (
      <Card className="tcg-surface">
        <CardContent className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </CardContent>
      </Card>
    );
  }

  if (sessionQuery.error || !liveSession) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex items-center gap-3 py-8 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {extractApiErrorMessage(sessionQuery.error, t("loadError"))}
        </CardContent>
      </Card>
    );
  }

  if (liveSession.status === "WAITING_FOR_DECKS") {
    return (
      <Card className="tcg-surface">
        <CardContent className="space-y-4 p-6 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{t("waitingOpponent")}</h2>
            <p className="text-sm text-muted-foreground">{t("waitingDecks")}</p>
          </div>
          <Badge variant="outline">vs {liveSession.opponentName}</Badge>
        </CardContent>
      </Card>
    );
  }

  if (liveSession.status === "CANCELLED") {
    return (
      <Card className="tcg-surface">
        <CardContent className="space-y-4 p-6 text-center">
          <h2 className="text-xl font-bold">{t("gameCancelled")}</h2>
          <Button asChild className="rounded-full">
            <Link href="/play">{t("back")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const emitAction = (action: MatchBoardActionInput) => {
    if (!socketRef.current || !enginePlayerId) {
      setLastError(t("realtimeNotReady"));
      return;
    }
    setLastError(null);
    socketRef.current.emit("casual_dispatch_action", {
      sessionId,
      action: { ...action, playerId: enginePlayerId },
    });
  };

  const emitPromptResponse = (response: MatchPromptResponseInput) => {
    if (!socketRef.current) {
      setLastError(t("realtimeNotReady"));
      return;
    }
    setLastError(null);
    socketRef.current.emit("casual_respond_prompt", {
      sessionId,
      response,
    });
  };

  return (
    <VisualMatchBoardView
      sessionStatus={liveSession.status}
      gameState={liveGameState}
      enginePlayerId={enginePlayerId}
      recentLog={liveLog}
      lastError={lastError}
      headerAside={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-emerald-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-amber-500" />
          )}
          {isConnected ? t("realtimeConnected") : "Reconnexion..."}
          {opponentDisconnected ? (
            <Badge
              variant="outline"
              className="border-amber-500 text-amber-500"
            >
              {t("opponentDisconnected")}
            </Badge>
          ) : null}
        </div>
      }
      introCard={
        <Card className="tcg-surface tcg-surface--soft">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Match casual 1v1
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge>vs {liveSession.opponentName}</Badge>
            <Badge variant="outline">Session #{liveSession.sessionId}</Badge>
          </CardContent>
        </Card>
      }
      footerCard={
        liveSession.status === "FINISHED" ? (
          <Card className="tcg-surface tcg-surface--highlight">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{t("gameOver")}</h2>
                <p className="text-sm leading-6 text-slate-600">
                  {liveGameState?.winnerId === enginePlayerId
                    ? t("youWon")
                    : t("opponentWon")}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-full">
                  <Link href="/play">{t("newGame")}</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/play">{t("back")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null
      }
      onDispatchAction={emitAction}
      onRespondPrompt={emitPromptResponse}
      onForfeit={() => emitAction({ type: "SURRENDER" })}
    />
  );
}
