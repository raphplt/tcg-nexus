"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  OnlineMatchLogEntry,
  SanitizedGameState,
  SanitizedHandCardView,
  SanitizedPokemonCardView,
} from "@/types/match-online";

export interface MatchBoardActionInput {
  type: string;
  payload?: Record<string, unknown>;
}

export interface MatchPromptResponseInput {
  promptId: string;
  selections?: string[];
  numericChoice?: number;
}

interface MatchBoardViewProps {
  sessionStatus: string;
  gameState: SanitizedGameState | null;
  enginePlayerId: string | null;
  recentLog: OnlineMatchLogEntry[];
  lastError?: string | null;
  isBusy?: boolean;
  headerAside?: ReactNode;
  introCard?: ReactNode;
  footerCard?: ReactNode;
  onDispatchAction: (action: MatchBoardActionInput) => void;
  onRespondPrompt: (response: MatchPromptResponseInput) => void;
}

const sessionStatusLabels: Record<string, string> = {
  WAITING_FOR_DECKS: "En attente des decks",
  ACTIVE: "En cours",
  FINISHED: "Terminé",
};

export function MatchBoardView({
  sessionStatus,
  gameState,
  enginePlayerId,
  recentLog,
  lastError,
  isBusy = false,
  headerAside,
  introCard,
  footerCard,
  onDispatchAction,
  onRespondPrompt,
}: MatchBoardViewProps) {
  const [promptSelections, setPromptSelections] = useState<string[]>([]);
  const [promptNumericChoice, setPromptNumericChoice] = useState<number | null>(
    null,
  );

  const viewerPlayer =
    enginePlayerId && gameState
      ? (gameState.players[enginePlayerId] ?? null)
      : null;
  const opponentPlayer =
    enginePlayerId && gameState
      ? (Object.values(gameState.players).find(
          (player) => player.playerId !== enginePlayerId,
        ) ?? null)
      : null;

  const pendingPrompt =
    gameState?.pendingPrompt &&
    gameState.pendingPrompt.playerId === enginePlayerId
      ? gameState.pendingPrompt
      : null;

  useEffect(() => {
    setPromptSelections([]);
    setPromptNumericChoice(null);
  }, [pendingPrompt?.id]);

  const promptReady = useMemo(() => {
    if (!pendingPrompt) {
      return false;
    }

    if (pendingPrompt.type === "CHOOSE_MULLIGAN_DRAW") {
      return promptNumericChoice !== null || promptSelections.length > 0;
    }

    if (pendingPrompt.allowPass && promptSelections.length === 0) {
      return true;
    }

    return promptSelections.length >= pendingPrompt.minSelections;
  }, [pendingPrompt, promptNumericChoice, promptSelections]);

  if (!gameState || !enginePlayerId || !viewerPlayer || !opponentPlayer) {
    return (
      <Card className="tcg-surface">
        <CardContent className="py-8 text-sm text-muted-foreground">
          Initialisation du terrain...
        </CardContent>
      </Card>
    );
  }

  const canAct =
    sessionStatus === "ACTIVE" &&
    gameState.gamePhase === "Play" &&
    gameState.activePlayerId === enginePlayerId &&
    !pendingPrompt &&
    !isBusy;

  const winnerLabel =
    sessionStatus === "FINISHED" && gameState.winnerId
      ? gameState.winnerId === enginePlayerId
        ? "Victoire"
        : "Défaite"
      : null;

  const submitPrompt = (pass = false) => {
    if (!pendingPrompt) {
      return;
    }

    if (pass) {
      onRespondPrompt({ promptId: pendingPrompt.id, selections: [] });
      return;
    }

    if (pendingPrompt.type === "CHOOSE_MULLIGAN_DRAW") {
      onRespondPrompt({
        promptId: pendingPrompt.id,
        numericChoice: promptNumericChoice ?? Number(promptSelections[0] || 0),
      });
      return;
    }

    onRespondPrompt({
      promptId: pendingPrompt.id,
      selections: promptSelections,
    });
  };

  return (
    <div className="space-y-4">
      <Card className="tcg-surface">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={sessionStatus === "FINISHED" ? "default" : "secondary"}
            >
              {sessionStatusLabels[sessionStatus] ?? sessionStatus}
            </Badge>
            <Badge variant="outline">Tour {gameState.turnNumber}</Badge>
            <Badge variant="outline">
              {gameState.activePlayerId === enginePlayerId
                ? "Votre tour"
                : "Tour adverse"}
            </Badge>
            {winnerLabel ? <Badge>{winnerLabel}</Badge> : null}
          </div>
          {headerAside}
        </CardContent>
      </Card>

      {introCard}

      {lastError ? (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">
            {lastError}
          </CardContent>
        </Card>
      ) : null}

      {pendingPrompt ? (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle>{pendingPrompt.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {pendingPrompt.options.map((option) => {
                const selected = promptSelections.includes(option.value);
                return (
                  <Button
                    key={option.value}
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    disabled={isBusy}
                    onClick={() => {
                      if (pendingPrompt.maxSelections === 1) {
                        setPromptSelections([option.value]);
                        if (pendingPrompt.type === "CHOOSE_MULLIGAN_DRAW") {
                          setPromptNumericChoice(Number(option.value));
                        }
                        return;
                      }

                      setPromptSelections((current) =>
                        current.includes(option.value)
                          ? current.filter((value) => value !== option.value)
                          : current.length >= pendingPrompt.maxSelections
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
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => submitPrompt()}
                disabled={!promptReady || isBusy}
              >
                Valider
              </Button>
              {pendingPrompt.allowPass ? (
                <Button
                  variant="outline"
                  onClick={() => submitPrompt(true)}
                  disabled={isBusy}
                >
                  Passer
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <BoardPlayer
            title="Adversaire"
            player={opponentPlayer}
            isCurrentTurn={gameState.activePlayerId === opponentPlayer.playerId}
          />
          <BoardPlayer
            title="Vous"
            player={viewerPlayer}
            isCurrentTurn={gameState.activePlayerId === viewerPlayer.playerId}
          />
          <Card className="tcg-surface">
            <CardHeader>
              <CardTitle>Votre main</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {(viewerPlayer.hand || []).map((card) => (
                  <HandCardActions
                    key={card.instanceId}
                    card={card}
                    activePokemon={viewerPlayer.active}
                    bench={viewerPlayer.bench}
                    onPlayBasicToBench={() =>
                      onDispatchAction({
                        type: "PLAY_POKEMON_TO_BENCH",
                        payload: { cardInstanceId: card.instanceId },
                      })
                    }
                    onAttachEnergy={(targetPokemonInstanceId) =>
                      onDispatchAction({
                        type: "ATTACH_ENERGY",
                        payload: {
                          energyCardInstanceId: card.instanceId,
                          targetPokemonInstanceId,
                        },
                      })
                    }
                    onPlayTrainer={() =>
                      onDispatchAction({
                        type: "PLAY_TRAINER",
                        payload: { trainerCardInstanceId: card.instanceId },
                      })
                    }
                    onEvolve={(targetPokemonInstanceId) =>
                      onDispatchAction({
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
              {!viewerPlayer.hand?.length ? (
                <div className="tcg-empty-state px-4 py-5 text-sm text-slate-500">
                  Votre main est vide.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="tcg-surface">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(viewerPlayer.active?.attacks || []).map((attack, attackIndex) => (
              <Button
                key={`${attack.name}-${attackIndex}`}
                className="w-full justify-start"
                variant="outline"
                disabled={!canAct}
                onClick={() =>
                  onDispatchAction({
                    type: "ATTACK",
                    payload: { attackIndex },
                  })
                }
              >
                Attaquer : {attack.name}
              </Button>
            ))}

            {viewerPlayer.active &&
              viewerPlayer.bench.map((pokemon) => (
                <Button
                  key={`retreat-${pokemon.instanceId}`}
                  className="w-full justify-start"
                  variant="outline"
                  disabled={
                    !canAct ||
                    (viewerPlayer.active?.retreat || 0) >
                      (viewerPlayer.active?.attachedEnergies.length || 0)
                  }
                  onClick={() =>
                    onDispatchAction({
                      type: "RETREAT",
                      payload: {
                        benchPokemonInstanceId: pokemon.instanceId,
                        discardedEnergyInstanceIds: (
                          viewerPlayer.active?.attachedEnergies || []
                        )
                          .slice(0, viewerPlayer.active?.retreat || 0)
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
              onClick={() => onDispatchAction({ type: "END_TURN" })}
            >
              Finir le tour
            </Button>

            <div className="space-y-2 border-t pt-3 text-xs text-muted-foreground">
              {recentLog.slice(-8).map((entry) => (
                <div key={entry.id}>{formatLogEntry(entry)}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {footerCard}
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
    <Card className="tcg-surface">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>
            {title} : {player.name}
          </span>
          {isCurrentTurn ? <Badge>Tour en cours</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>Deck : {player.deckCount}</span>
          <span>Main : {player.handCount}</span>
          <span>Récompenses restantes : {player.prizesRemaining}</span>
        </div>
        <PokemonPanel label="Actif" pokemon={player.active} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
    <div className="tcg-note-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {pokemon ? (
        <div className="mt-2 space-y-2">
          <div className="font-medium">{pokemon.name}</div>
          <div className="text-sm text-muted-foreground">
            PV {Math.max(0, pokemon.hp - pokemon.damageCounters)} / {pokemon.hp}
          </div>
          <div className="text-xs text-muted-foreground">
            Énergies : {pokemon.attachedEnergyCount}
          </div>
          {pokemon.specialConditions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {pokemon.specialConditions.map((condition) => (
                <Badge key={condition} variant="destructive">
                  {condition}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">Aucun Pokémon</div>
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
    <div className="tcg-note-card p-3">
      <div className="font-medium">{card.name}</div>
      <div className="text-xs text-muted-foreground">{card.category}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {card.category === "Pokémon" && card.stage === "De base" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={onPlayBasicToBench}
          >
            Jouer sur le banc
          </Button>
        ) : null}

        {card.category === "Énergie"
          ? [activePokemon, ...bench]
              .filter((pokemon): pokemon is SanitizedPokemonCardView =>
                Boolean(pokemon),
              )
              .map((pokemon) => (
                <Button
                  key={`${card.instanceId}-${pokemon.instanceId}`}
                  size="sm"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => onAttachEnergy(pokemon.instanceId)}
                >
                  Attacher à {pokemon.name}
                </Button>
              ))
          : null}

        {card.category === "Dresseur" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={onPlayTrainer}
          >
            Jouer
          </Button>
        ) : null}

        {card.category === "Pokémon" && card.stage !== "De base"
          ? evolutionTargets.map((pokemon) => (
              <Button
                key={`${card.instanceId}-${pokemon.instanceId}`}
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => onEvolve(pokemon.instanceId)}
              >
                Évoluer {pokemon.name}
              </Button>
            ))
          : null}
      </div>
    </div>
  );
}

function formatLogEntry(entry: OnlineMatchLogEntry) {
  const actionType = entry.payload.type;
  if (entry.kind === "ACTION" && typeof actionType === "string") {
    return `Action : ${actionType}`;
  }

  const eventType = entry.payload.type;
  if (typeof eventType === "string") {
    return `Événement : ${eventType}`;
  }

  const reason = entry.payload.reason;
  if (typeof reason === "string") {
    return reason;
  }

  return JSON.stringify(entry.payload);
}
