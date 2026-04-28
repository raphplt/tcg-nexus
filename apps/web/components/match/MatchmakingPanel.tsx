"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Loader2,
  Swords,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
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
import { casualMatchService } from "@/services/casual-match.service";
import type {
  CasualLobbyView,
  CasualSessionSummary,
} from "@/types/casual-match";
import { extractApiErrorMessage } from "@/utils/api-error";
import { API_BASE_URL } from "@/utils/fetch";

type MatchmakingStatus = "idle" | "queued" | "matched";

export function MatchmakingPanel() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [mmStatus, setMmStatus] = useState<MatchmakingStatus>("idle");
  const [queueSize, setQueueSize] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [matchedSessionId, setMatchedSessionId] = useState<number | null>(null);

  const lobbyQuery = useQuery<CasualLobbyView>({
    queryKey: ["casual-matches", "lobby"],
    queryFn: () => casualMatchService.getLobby(),
  });

  const eligibleDecks = useMemo(
    () =>
      (lobbyQuery.data?.availableDecks || []).filter((deck) => deck.eligible),
    [lobbyQuery.data?.availableDecks],
  );

  useEffect(() => {
    if (!selectedDeckId && eligibleDecks.length > 0 && eligibleDecks[0]) {
      setSelectedDeckId(eligibleDecks[0].deckId);
    }
  }, [eligibleDecks, selectedDeckId]);

  const socketBaseUrl = useMemo(() => {
    if (API_BASE_URL.startsWith("http")) {
      return API_BASE_URL;
    }
    if (typeof window === "undefined") {
      return "";
    }
    return new URL(API_BASE_URL, window.location.origin).toString();
  }, []);

  const connectSocket = useCallback(() => {
    if (socketRef.current || !socketBaseUrl) return;

    const socket = io(`${socketBaseUrl}/match`, {
      transports: ["websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on(
      "matchmaking_status",
      (data: { status: string; queueSize?: number }) => {
        if (data.status === "queued") {
          setMmStatus("queued");
          if (typeof data.queueSize === "number") setQueueSize(data.queueSize);
        } else if (data.status === "idle") {
          setMmStatus("idle");
          setQueueSize(0);
        }
      },
    );

    socket.on("matchmaking_matched", (data: { sessionId: number }) => {
      setMmStatus("matched");
      setMatchedSessionId(data.sessionId);
    });

    socket.on("matchmaking_error", (data: { message: string }) => {
      setLastError(data.message);
      setMmStatus("idle");
    });

    return socket;
  }, [socketBaseUrl]);

  const disconnectSocket = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => disconnectSocket();
  }, [disconnectSocket]);

  // Auto-redirect when matched
  useEffect(() => {
    if (matchedSessionId) {
      router.push(`/play/casual/${matchedSessionId}`);
    }
  }, [matchedSessionId, router]);

  const handleJoinQueue = () => {
    if (!selectedDeckId) return;
    setLastError(null);
    const socket = socketRef.current || connectSocket();
    if (socket) {
      socket.emit("matchmaking_join", { deckId: selectedDeckId });
      setMmStatus("queued");
    }
  };

  const handleLeaveQueue = () => {
    if (socketRef.current) {
      socketRef.current.emit("matchmaking_leave");
    }
    setMmStatus("idle");
    setQueueSize(0);
  };

  if (lobbyQuery.isLoading) {
    return (
      <Card className="tcg-surface tcg-surface--dark">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du matchmaking...
        </CardContent>
      </Card>
    );
  }

  if (lobbyQuery.error || !lobbyQuery.data) {
    return (
      <Card className="tcg-surface tcg-surface--dark">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-destructive">
            {extractApiErrorMessage(
              lobbyQuery.error,
              "Impossible de charger le matchmaking.",
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
    <Card className="tcg-surface tcg-surface--dark">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Match 1v1
            </p>
            <Badge className="border-0 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20">
              En ligne
            </Badge>
          </div>
          {mmStatus !== "idle" && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              {isConnected ? (
                <Wifi className="h-3 w-3 text-emerald-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-amber-400" />
              )}
              {isConnected ? "Connecté" : "Connexion..."}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold leading-tight text-white">
            Affrontez un joueur.
          </h2>
          <p className="text-sm leading-6 text-slate-300">
            Choisissez un deck, rejoignez la file d'attente et vous serez
            automatiquement associé à un adversaire.
          </p>
        </div>

        {lastError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {lastError}
          </div>
        )}

        {mmStatus === "matched" ? (
          <div className="space-y-3 text-center">
            <div className="flex items-center justify-center gap-3 text-emerald-400">
              <Users className="h-5 w-5" />
              <span className="text-lg font-bold">Adversaire trouvé !</span>
            </div>
            <p className="text-sm text-slate-300">
              Redirection vers la partie...
            </p>
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-emerald-400" />
          </div>
        ) : mmStatus === "queued" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-5 text-amber-300">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  Recherche d'un adversaire...
                </p>
                <p className="text-xs text-amber-400/70">
                  {queueSize > 1
                    ? `${queueSize} joueur${queueSize > 1 ? "s" : ""} en file`
                    : "En attente d'un autre joueur"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full rounded-full border-slate-600 text-slate-300 hover:text-white"
              onClick={handleLeaveQueue}
            >
              Quitter la file
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {eligibleDecks.length ? (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Votre deck
                  </p>
                  <Select
                    value={selectedDeckId?.toString()}
                    onValueChange={(value) => setSelectedDeckId(Number(value))}
                  >
                    <SelectTrigger className="w-full rounded-2xl border-slate-600 bg-slate-800 text-white">
                      <SelectValue placeholder="Choisir un deck" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleDecks.map((deck) => (
                        <SelectItem
                          key={deck.deckId}
                          value={String(deck.deckId)}
                        >
                          {deck.deckName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full rounded-full"
                  disabled={!selectedDeckId}
                  onClick={handleJoinQueue}
                >
                  Chercher un adversaire
                  <Swords className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-sm text-slate-400">
                  Aucun deck compatible pour le jeu en ligne.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-slate-600 text-slate-300"
                >
                  <Link href="/decks/me">
                    Gérer mes decks
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {lobbyQuery.data.activeSessions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Parties en cours
            </p>
            {lobbyQuery.data.activeSessions.map((session) => (
              <CasualSessionCard key={session.sessionId} session={session} />
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">BO1</Badge>
          <Badge variant="secondary">Standard</Badge>
          <Badge variant="secondary">60 cartes</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function CasualSessionCard({ session }: { session: CasualSessionSummary }) {
  return (
    <div className="rounded-2xl border border-slate-600/50 bg-slate-800/50 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-white">vs {session.opponentName}</p>
          <p className="text-xs text-slate-400">
            Tour {session.turnNumber} •{" "}
            {new Date(session.updatedAt).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Badge variant={session.awaitingPlayerAction ? "default" : "secondary"}>
          {session.awaitingPlayerAction ? "À vous" : "Tour adverse"}
        </Badge>
      </div>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="rounded-full border-slate-600 text-slate-300"
      >
        <Link href={`/play/casual/${session.sessionId}`}>
          Reprendre
          <ArrowRight className="ml-2 h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}
