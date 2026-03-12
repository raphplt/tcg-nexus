"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { matchOnlineService } from "@/services/match-online.service";
import { useMatchStore } from "@/store/useMatchStore";
import {
  OnlineMatchSessionView,
  PendingPromptView,
  SanitizedGameState,
  SanitizedHandCardView,
  SanitizedPokemonCardView,
} from "@/types/match-online";
import { API_BASE_URL } from "@/utils/fetch";

interface GameBoardProps {
  matchId: number;
}

export default function GameBoard({ matchId }: GameBoardProps) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [promptSelections, setPromptSelections] = useState<string[]>([]);
  const [promptNumericChoice, setPromptNumericChoice] = useState<number | null>(
    null,
  );
  const {
    sessionView,
    gameState,
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
    onError: (error: any) => {
      setError(error?.response?.data?.message || error?.message || "Deck selection failed");
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
      sessionQuery.data?.status === "ACTIVE" || sessionQuery.data?.status === "FINISHED";

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
  const viewerPlayer = enginePlayerId && liveGameState
    ? liveGameState.players[enginePlayerId]
    : null;
  const opponentPlayer =
    enginePlayerId && liveGameState
      ? Object.values(liveGameState.players).find(
          (player) => player.playerId !== enginePlayerId,
        ) || null
      : null;

  const pendingPrompt =
    liveGameState?.pendingPrompt &&
    liveGameState.pendingPrompt.playerId === enginePlayerId
      ? liveGameState.pendingPrompt
      : null;

  useEffect(() => {
    setPromptSelections([]);
    setPromptNumericChoice(null);
  }, [pendingPrompt?.id]);

  if (sessionQuery.isLoading || eligibilityQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement de la session online...
        </CardContent>
      </Card>
    );
  }

  if (sessionQuery.error || eligibilityQuery.error || !liveSession) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-8 text-sm text-destructive flex items-center gap-3">
          <AlertTriangle className="w-4 h-4" />
          Impossible de charger la session online.
        </CardContent>
      </Card>
    );
  }

  const emitAction = (action: Record<string, unknown>) => {
    if (!socketRef.current || !enginePlayerId) {
      setError("Realtime connection is not ready");
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

  const emitPromptResponse = (prompt: PendingPromptView) => {
    if (!socketRef.current) {
      setError("Realtime connection is not ready");
      return;
    }

    const payload: {
      promptId: string;
      selections?: string[];
      numericChoice?: number;
    } = {
      promptId: prompt.id,
    };

    if (prompt.type === "CHOOSE_MULLIGAN_DRAW") {
      payload.numericChoice =
        promptNumericChoice ?? Number(promptSelections[0] || 0);
    } else {
      payload.selections = promptSelections;
    }

    setError(null);
    socketRef.current.emit("respond_prompt", {
      matchId,
      response: payload,
    });
  };

  const renderDeckSelection = () => (
    <Card>
      <CardHeader>
        <CardTitle>Choix du deck online</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(eligibilityQuery.data?.eligibleDecks || []).map((deck) => (
          <div
            key={deck.deckId}
            className="rounded-lg border p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">{deck.deckName}</div>
                <div className="text-xs text-muted-foreground">
                  {deck.totalCards} cartes
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={deck.eligible ? "default" : "destructive"}>
                  {deck.eligible ? "Eligible" : "Bloque"}
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
            {!deck.eligible && (
              <div className="text-xs text-destructive space-y-1">
                {deck.reasons.map((reason, index) => (
                  <div key={`${deck.deckId}-${reason.code}-${index}`}>
                    {reason.message}
                    {reason.cardName ? `: ${reason.cardName}` : ""}
                  </div>
                ))}
              </div>
            )}
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
      <Card>
        <CardHeader>
          <CardTitle>Session online en attente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Votre deck est selectionne. La partie commencera des que l’adversaire aura choisi le sien.</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Deck #{liveSession.selectedDeckId}</Badge>
            <Badge variant={liveSession.opponentDeckReady ? "default" : "secondary"}>
              {liveSession.opponentDeckReady
                ? "Deck adverse pret"
                : "En attente du deck adverse"}
            </Badge>
          </div>
          {renderDeckSelection()}
        </CardContent>
      </Card>
    );
  }

  if (!liveGameState || !viewerPlayer || !opponentPlayer) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Initialisation du terrain...
        </CardContent>
      </Card>
    );
  }

  const currentSession = liveSession;
  const currentGameState = liveGameState;
  const currentViewer = viewerPlayer;
  const currentOpponent = opponentPlayer;
  const currentPrompt = pendingPrompt;
  const canAct =
    currentSession.status === "ACTIVE" &&
    currentGameState.gamePhase === "Play" &&
    currentGameState.activePlayerId === enginePlayerId &&
    !currentPrompt;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={currentSession.status === "FINISHED" ? "default" : "secondary"}>
              {currentSession.status}
            </Badge>
            <Badge variant="outline">Tour {currentGameState.turnNumber}</Badge>
            <Badge variant="outline">
              {currentGameState.activePlayerId === enginePlayerId
                ? "Votre tour"
                : "Tour adverse"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-emerald-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-500" />
            )}
            {isConnected ? "Temps reel connecte" : "Reconnexion..."}
          </div>
        </CardContent>
      </Card>

      {lastError && (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">
            {lastError}
          </CardContent>
        </Card>
      )}

      {currentPrompt && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle>{currentPrompt.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {currentPrompt.options.map((option) => {
                const selected = promptSelections.includes(option.value);
                return (
                  <Button
                    key={option.value}
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (currentPrompt.maxSelections === 1) {
                        setPromptSelections([option.value]);
                        if (currentPrompt.type === "CHOOSE_MULLIGAN_DRAW") {
                          setPromptNumericChoice(Number(option.value));
                        }
                        return;
                      }

                      setPromptSelections((current) =>
                        current.includes(option.value)
                          ? current.filter((value) => value !== option.value)
                          : current.length >= currentPrompt.maxSelections
                            ? current
                            : [...current, option.value],
                      );
                    }}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
            <Button
              onClick={() => emitPromptResponse(currentPrompt)}
              disabled={
                promptSelections.length < currentPrompt.minSelections &&
                currentPrompt.type !== "CHOOSE_MULLIGAN_DRAW"
              }
            >
              Valider
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <BoardPlayer
            title="Adversaire"
            player={currentOpponent}
            isCurrentTurn={currentGameState.activePlayerId === currentOpponent.playerId}
          />
          <BoardPlayer
            title="Vous"
            player={currentViewer}
            isCurrentTurn={currentGameState.activePlayerId === currentViewer.playerId}
          />
          <Card>
            <CardHeader>
              <CardTitle>Votre main</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(currentViewer.hand || []).map((card) => (
                  <HandCardActions
                    key={card.instanceId}
                    card={card}
                    activePokemon={currentViewer.active}
                    bench={currentViewer.bench}
                    onPlayBasicToBench={() =>
                      emitAction({
                        type: "PLAY_POKEMON_TO_BENCH",
                        payload: { cardInstanceId: card.instanceId },
                      })
                    }
                    onAttachEnergy={(targetPokemonInstanceId) =>
                      emitAction({
                        type: "ATTACH_ENERGY",
                        payload: {
                          energyCardInstanceId: card.instanceId,
                          targetPokemonInstanceId,
                        },
                      })
                    }
                    onPlayTrainer={() =>
                      emitAction({
                        type: "PLAY_TRAINER",
                        payload: { trainerCardInstanceId: card.instanceId },
                      })
                    }
                    onEvolve={(targetPokemonInstanceId) =>
                      emitAction({
                        type: "EVOLVE_POKEMON",
                        payload: {
                          evolutionCardInstanceId: card.instanceId,
                          targetPokemonInstanceId,
                        },
                      })
                    }
                    disabled={!canAct}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(currentViewer.active?.attacks || []).map((attack, attackIndex) => (
              <Button
                key={`${attack.name}-${attackIndex}`}
                className="w-full justify-start"
                variant="outline"
                disabled={!canAct}
                onClick={() =>
                  emitAction({
                    type: "ATTACK",
                    payload: { attackIndex },
                  })
                }
              >
                Attaquer: {attack.name}
              </Button>
            ))}

            {currentViewer.active &&
              currentViewer.bench.map((pokemon) => (
                <Button
                  key={`retreat-${pokemon.instanceId}`}
                  className="w-full justify-start"
                  variant="outline"
                  disabled={
                    !canAct ||
                    (currentViewer.active?.retreat || 0) >
                      (currentViewer.active?.attachedEnergies.length || 0)
                  }
                  onClick={() =>
                    emitAction({
                      type: "RETREAT",
                      payload: {
                        benchPokemonInstanceId: pokemon.instanceId,
                        discardedEnergyInstanceIds: (
                          currentViewer.active?.attachedEnergies || []
                        )
                          .slice(0, currentViewer.active?.retreat || 0)
                          .map((energy) => energy.instanceId),
                      },
                    })
                  }
                >
                  Retraite vers {pokemon.name}
                </Button>
              ))}

            <Button
              className="w-full"
              disabled={!canAct}
              onClick={() => emitAction({ type: "END_TURN" })}
            >
              Finir le tour
            </Button>

            <div className="pt-3 border-t text-xs text-muted-foreground space-y-2">
              {currentSession.recentLog.slice(-8).map((entry) => (
                <div key={entry.id}>{JSON.stringify(entry.payload)}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BoardPlayer({
  title,
  player,
  isCurrentTurn,
}: {
  title: string;
  player: SanitizedGameState["players"][string];
  isCurrentTurn: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>{title}: {player.name}</span>
          {isCurrentTurn && <Badge>Tour en cours</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>Deck: {player.deckCount}</span>
          <span>Main: {player.handCount}</span>
          <span>Prix restants: {player.prizesRemaining}</span>
        </div>
        <PokemonPanel label="Actif" pokemon={player.active} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {player.bench.map((pokemon) => (
            <PokemonPanel
              key={pokemon.instanceId}
              label="Banc"
              pokemon={pokemon}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PokemonPanel({
  label,
  pokemon,
}: {
  label: string;
  pokemon: SanitizedPokemonCardView | null;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {pokemon ? (
        <>
          <div className="font-medium">{pokemon.name}</div>
          <div className="text-sm text-muted-foreground">
            PV {Math.max(0, pokemon.hp - pokemon.damageCounters)} / {pokemon.hp}
          </div>
          <div className="text-xs text-muted-foreground">
            Energies: {pokemon.attachedEnergyCount}
          </div>
          {pokemon.specialConditions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {pokemon.specialConditions.map((condition) => (
                <Badge key={condition} variant="destructive">
                  {condition}
                </Badge>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-muted-foreground">Aucun Pokemon</div>
      )}
    </div>
  );
}

function HandCardActions({
  card,
  activePokemon,
  bench,
  onPlayBasicToBench,
  onAttachEnergy,
  onPlayTrainer,
  onEvolve,
  disabled,
}: {
  card: SanitizedHandCardView;
  activePokemon: SanitizedPokemonCardView | null;
  bench: SanitizedPokemonCardView[];
  onPlayBasicToBench: () => void;
  onAttachEnergy: (targetPokemonInstanceId: string) => void;
  onPlayTrainer: () => void;
  onEvolve: (targetPokemonInstanceId: string) => void;
  disabled: boolean;
}) {
  const evolutionTargets = [activePokemon, ...bench].filter(
    (pokemon): pokemon is SanitizedPokemonCardView =>
      Boolean(pokemon) && card.stage !== "De base",
  );

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="font-medium">{card.name}</div>
      <div className="text-xs text-muted-foreground">{card.category}</div>
      <div className="flex flex-wrap gap-2">
        {card.category === "Pokémon" && card.stage === "De base" && (
          <Button size="sm" variant="outline" disabled={disabled} onClick={onPlayBasicToBench}>
            Jouer sur le banc
          </Button>
        )}

        {card.category === "Énergie" &&
          [activePokemon, ...bench]
            .filter((pokemon): pokemon is SanitizedPokemonCardView => Boolean(pokemon))
            .map((pokemon) => (
              <Button
                key={`${card.instanceId}-${pokemon.instanceId}`}
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => onAttachEnergy(pokemon.instanceId)}
              >
                Attacher a {pokemon.name}
              </Button>
            ))}

        {card.category === "Dresseur" && (
          <Button size="sm" variant="outline" disabled={disabled} onClick={onPlayTrainer}>
            Jouer
          </Button>
        )}

        {card.category === "Pokémon" &&
          card.stage !== "De base" &&
          evolutionTargets.map((pokemon) => (
            <Button
              key={`${card.instanceId}-${pokemon.instanceId}`}
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => onEvolve(pokemon.instanceId)}
            >
              Evoluer {pokemon.name}
            </Button>
          ))}
      </div>
    </div>
  );
}
