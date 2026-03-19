"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";
import type {
  MatchBoardActionInput,
  MatchPromptResponseInput,
} from "@/components/match/MatchBoardView";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  OnlineMatchLogEntry,
  SanitizedGameState,
} from "@/types/match-online";
import { ActionBar } from "./ActionBar";
import { AttackPanel } from "./AttackPanel";
import { HandBar } from "./HandBar";
import { PlayerField } from "./PlayerField";
import { PromptOverlay } from "./PromptOverlay";
import { useGameBoardInteraction } from "./useGameBoardInteraction";

interface VisualMatchBoardViewProps {
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

export function VisualMatchBoardView({
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
}: VisualMatchBoardViewProps) {
  const viewerPlayer =
    enginePlayerId && gameState
      ? (gameState.players[enginePlayerId] ?? null)
      : null;
  const opponentPlayer =
    enginePlayerId && gameState
      ? (Object.values(gameState.players).find(
          (p) => p.playerId !== enginePlayerId,
        ) ?? null)
      : null;

  const pendingPrompt =
    gameState?.pendingPrompt &&
    gameState.pendingPrompt.playerId === enginePlayerId
      ? gameState.pendingPrompt
      : null;

  const canAct =
    sessionStatus === "ACTIVE" &&
    gameState?.gamePhase === "Play" &&
    gameState?.activePlayerId === enginePlayerId &&
    !pendingPrompt &&
    !isBusy;

  const interaction = useGameBoardInteraction(
    viewerPlayer,
    canAct,
    onDispatchAction,
  );

  const winnerLabel =
    sessionStatus === "FINISHED" && gameState?.winnerId
      ? gameState.winnerId === enginePlayerId
        ? "Victoire"
        : "Défaite"
      : null;

  // Loading state
  if (!gameState || !enginePlayerId || !viewerPlayer || !opponentPlayer) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/50 text-sm">Initialisation du terrain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-[calc(100dvh-5rem)] bg-gradient-to-b from-slate-950 via-blue-950/40 to-slate-950 overflow-hidden select-none">
      {/* Top bar: status */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5 z-30">
        <div className="flex items-center gap-2">
          <Badge
            variant={sessionStatus === "FINISHED" ? "default" : "secondary"}
            className="text-[10px]"
          >
            {sessionStatusLabels[sessionStatus] ?? sessionStatus}
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] border-white/20 text-white/60"
          >
            Tour {gameState.turnNumber}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] border-white/20",
              gameState.activePlayerId === enginePlayerId
                ? "text-emerald-400 border-emerald-400/30"
                : "text-white/40",
            )}
          >
            {gameState.activePlayerId === enginePlayerId
              ? "Votre tour"
              : "Tour adverse"}
          </Badge>
          {winnerLabel && (
            <Badge
              className={cn(
                winnerLabel === "Victoire" ? "bg-emerald-600" : "bg-red-600",
              )}
            >
              {winnerLabel}
            </Badge>
          )}
        </div>
        {headerAside}
      </div>

      {introCard && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40">
          {introCard}
        </div>
      )}

      {/* Error toast */}
      <AnimatePresence>
        {lastError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-4 py-2 rounded-lg text-sm shadow-lg"
          >
            {lastError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game board - isometric perspective */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            perspective: "1200px",
          }}
        >
          <div
            className="relative w-full max-w-3xl"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateX(30deg) scale(0.9)",
              transformOrigin: "center bottom",
            }}
          >
            {/* Board surface */}
            <div className="relative rounded-2xl bg-gradient-to-b from-blue-900/30 to-teal-900/30 border border-white/5 px-6 py-3 space-y-2">
              {/* Mat texture overlay */}
              <div className="absolute inset-0 rounded-2xl opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_70%)]" />

              {/* Opponent field */}
              <div className="relative">
                <PlayerField
                  player={opponentPlayer}
                  isOpponent
                  isCurrentTurn={
                    gameState.activePlayerId === opponentPlayer.playerId
                  }
                  disabled
                />
              </div>

              {/* Center divider - battle zone */}
              <div className="flex items-center gap-4 py-0.5">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">
                  VS
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>

              {/* Player field */}
              <div className="relative">
                <PlayerField
                  player={viewerPlayer}
                  isCurrentTurn={
                    gameState.activePlayerId === viewerPlayer.playerId
                  }
                  onActivePokemonClick={
                    canAct && interaction.mode === "idle"
                      ? interaction.openAttackPanel
                      : interaction.mode === "attaching_energy" ||
                          interaction.mode === "evolving"
                        ? () =>
                            viewerPlayer.active &&
                            interaction.selectTarget(
                              viewerPlayer.active.instanceId,
                            )
                        : undefined
                  }
                  onBenchPokemonClick={(instanceId) => {
                    if (interaction.mode === "placing_pokemon") {
                      interaction.selectTarget(instanceId);
                    } else if (
                      interaction.mode === "attaching_energy" ||
                      interaction.mode === "evolving"
                    ) {
                      interaction.selectTarget(instanceId);
                    } else if (canAct && interaction.mode === "idle") {
                      // Could open retreat dialog
                    }
                  }}
                  activeSelected={interaction.mode === "choosing_attack"}
                  activeHighlighted={
                    interaction.mode === "attaching_energy" ||
                    interaction.mode === "evolving"
                  }
                  highlightedBenchIds={interaction.validTargetIds.filter(
                    (id) => id !== "empty_bench",
                  )}
                  highlightedEmptyBench={interaction.mode === "placing_pokemon"}
                  disabled={!canAct && interaction.mode === "idle"}
                />

                {/* Attack panel overlay */}
                <AnimatePresence>
                  {interaction.mode === "choosing_attack" &&
                    viewerPlayer.active && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute left-1/2 -translate-x-1/2 bottom-0 z-40"
                      >
                        <AttackPanel
                          pokemon={viewerPlayer.active}
                          onAttack={interaction.dispatchAttack}
                          onRetreat={interaction.dispatchRetreat}
                          onClose={interaction.closeAttackPanel}
                          benchPokemon={viewerPlayer.bench}
                          disabled={isBusy}
                        />
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Event log (floating, right side) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-48 max-h-60 overflow-y-auto z-20 bg-black/40 rounded-lg p-2 backdrop-blur-sm border border-white/5">
          <div className="text-[8px] uppercase text-white/30 tracking-wider mb-1 font-bold">
            Événements
          </div>
          {recentLog.slice(-8).map((entry) => (
            <div
              key={entry.id}
              className="text-[10px] text-white/40 py-0.5 border-b border-white/5 last:border-0"
            >
              {formatLogEntry(entry)}
            </div>
          ))}
          {recentLog.length === 0 && (
            <div className="text-[10px] text-white/20">Aucun événement</div>
          )}
        </div>
      </div>

      {/* Hand bar */}
      <div className="relative z-30 bg-slate-900/80 backdrop-blur-sm border-t border-white/10">
        <HandBar
          hand={viewerPlayer.hand || []}
          selectedCardId={interaction.selectedHandCard?.instanceId ?? null}
          onCardClick={interaction.selectHandCard}
          disabled={!canAct}
        />
      </div>

      {/* Action bar */}
      <div className="relative z-30">
        <ActionBar
          mode={interaction.mode}
          hintText={interaction.hintText}
          canAct={canAct}
          isBusy={isBusy}
          onEndTurn={() => onDispatchAction({ type: "END_TURN" })}
          onCancel={interaction.cancel}
        />
      </div>

      {/* Prompt overlay */}
      {pendingPrompt && (
        <PromptOverlay
          prompt={pendingPrompt}
          isBusy={isBusy}
          onRespond={onRespondPrompt}
        />
      )}

      {/* Victory/Defeat overlay */}
      <AnimatePresence>
        {winnerLabel && sessionStatus === "FINISHED" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 15 }}
              className="text-center space-y-4"
            >
              <h2
                className={cn(
                  "text-5xl font-black tracking-tight",
                  winnerLabel === "Victoire"
                    ? "text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.4)]"
                    : "text-red-400 drop-shadow-[0_0_30px_rgba(248,113,113,0.4)]",
                )}
              >
                {winnerLabel === "Victoire" ? "VICTOIRE !" : "DÉFAITE"}
              </h2>
              {gameState.winnerReason && (
                <p className="text-white/60 text-sm">
                  {formatWinReason(gameState.winnerReason)}
                </p>
              )}
              {footerCard}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatLogEntry(entry: OnlineMatchLogEntry) {
  const actionType = entry.payload.type;
  if (entry.kind === "ACTION" && typeof actionType === "string") {
    return actionType.replace(/_/g, " ").toLowerCase();
  }
  if (typeof actionType === "string") {
    return actionType.replace(/_/g, " ").toLowerCase();
  }
  const reason = entry.payload.reason;
  if (typeof reason === "string") return reason;
  return JSON.stringify(entry.payload).slice(0, 50);
}

function formatWinReason(reason: string): string {
  const reasons: Record<string, string> = {
    PrizeOut: "Toutes les cartes récompenses récupérées !",
    DeckOut: "Plus de cartes dans le deck adverse.",
    NoPokemon: "L'adversaire n'a plus de Pokémon en jeu.",
    Forfeit: "L'adversaire a abandonné.",
  };
  return reasons[reason] ?? reason;
}
