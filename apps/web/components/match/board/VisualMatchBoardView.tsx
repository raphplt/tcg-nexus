"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Shield, Swords, Zap } from "lucide-react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type {
  MatchBoardActionInput,
  MatchPromptResponseInput,
} from "@/components/match/MatchBoardView";
import { cn } from "@/lib/utils";
import type {
  OnlineMatchLogEntry,
  SanitizedGameState,
} from "@/types/match-online";
import { ActionBar } from "./ActionBar";
import { AttackPanel } from "./AttackPanel";
import { HandBar } from "./HandBar";
import { PauseMenu } from "./PauseMenu";
import { PlayerField } from "./PlayerField";
import { PromptOverlay } from "./PromptOverlay";
import { TurnBanner } from "./TurnBanner";
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
  onForfeit?: () => void;
}

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
  onForfeit,
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

  // Detect attack events for flash animation
  const [attackFlash, setAttackFlash] = useState<
    "player" | "opponent" | null
  >(null);
  const prevLogLenRef = useRef(recentLog.length);

  useEffect(() => {
    if (recentLog.length > prevLogLenRef.current) {
      const newEvents = recentLog.slice(prevLogLenRef.current);
      for (const evt of newEvents) {
        const type = evt.payload.type;
        if (type === "ATTACK" || type === "attack") {
          const attackerId = evt.payload.playerId;
          setAttackFlash(
            attackerId === enginePlayerId ? "player" : "opponent",
          );
          setTimeout(() => setAttackFlash(null), 600);
          break;
        }
      }
    }
    prevLogLenRef.current = recentLog.length;
  }, [recentLog, enginePlayerId]);

  // Confetti for victory
  const confettiParticles = useMemo(() => {
    if (winnerLabel !== "Victoire") return [];
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 3,
      color: [
        "bg-yellow-400",
        "bg-emerald-400",
        "bg-blue-400",
        "bg-pink-400",
        "bg-purple-400",
      ][i % 5],
      size: 4 + Math.random() * 6,
    }));
  }, [winnerLabel]);

  // Loading state
  if (!gameState || !enginePlayerId || !viewerPlayer || !opponentPlayer) {
    return (
      <div className="flex items-center justify-center h-dvh bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-2 border-blue-400/30 rounded-full" />
            <div className="absolute inset-0 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-2 border-2 border-emerald-400 border-b-transparent rounded-full animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
          </div>
          <p className="text-white/40 text-sm font-medium tracking-wider uppercase">
            Initialisation du terrain...
          </p>
        </div>
      </div>
    );
  }

  const isMyTurn = gameState.activePlayerId === enginePlayerId;

  return (
    <div className="relative flex flex-col h-dvh bg-gradient-to-b from-slate-950 via-blue-950/30 to-slate-950 overflow-hidden select-none">
      {/* Animated ambient border glow */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000",
          isMyTurn ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent" />
      </div>

      {/* ═══════════ HUD TOP BAR ═══════════ */}
      <div className="relative flex items-center justify-between px-4 py-2.5 bg-black/50 border-b border-white/5 z-30 backdrop-blur-sm">
        {/* Left: Player info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full transition-colors duration-500",
                isMyTurn ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-white/20",
              )}
            />
            <span className="text-sm font-bold text-white">
              Vous
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-yellow-400/70" />
            <span className="text-[11px] text-yellow-300/80 font-medium">
              {viewerPlayer.prizesRemaining}
            </span>
          </div>
        </div>

        {/* Center: Turn indicator */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
          <div
            className={cn(
              "px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-500",
              isMyTurn
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.2)]"
                : "bg-red-500/10 text-red-300/70 border border-red-500/20",
            )}
          >
            <span className="flex items-center gap-2">
              {isMyTurn ? (
                <Swords className="w-3 h-3" />
              ) : (
                <Zap className="w-3 h-3" />
              )}
              Tour {gameState.turnNumber}
            </span>
          </div>
        </div>

        {/* Right: Opponent info + controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-yellow-400/70" />
            <span className="text-[11px] text-yellow-300/80 font-medium">
              {opponentPlayer.prizesRemaining}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-red-300/80">
              {opponentPlayer.name}
            </span>
            <div
              className={cn(
                "w-2 h-2 rounded-full transition-colors duration-500",
                !isMyTurn ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" : "bg-white/20",
              )}
            />
          </div>
          {headerAside}
          <PauseMenu
            onForfeit={onForfeit}
            sessionStatus={sessionStatus}
          />
        </div>
      </div>

      {introCard && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40">
          {introCard}
        </div>
      )}

      {/* Error toast */}
      <AnimatePresence>
        {lastError && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-4 py-2 rounded-lg text-sm shadow-lg shadow-red-600/20 backdrop-blur-sm"
          >
            {lastError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ GAME BOARD ═══════════ */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ perspective: "1200px" }}
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
              {/* Mat texture - hex pattern */}
              <div className="absolute inset-0 rounded-2xl opacity-[0.04]">
                <svg
                  className="w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern
                      id="hex"
                      width="28"
                      height="49"
                      patternUnits="userSpaceOnUse"
                      patternTransform="scale(0.8)"
                    >
                      <path
                        d="M14 0 L28 8.66 L28 25.98 L14 34.64 L0 25.98 L0 8.66 Z"
                        fill="none"
                        stroke="white"
                        strokeWidth="0.5"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#hex)" />
                </svg>
              </div>

              {/* Radial glow overlay */}
              <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06)_0%,transparent_70%)]" />

              {/* Opponent field */}
              <motion.div
                className="relative"
                animate={
                  attackFlash === "opponent"
                    ? { x: [0, -4, 4, -3, 3, 0] }
                    : {}
                }
                transition={{ duration: 0.4 }}
              >
                <PlayerField
                  player={opponentPlayer}
                  isOpponent
                  isCurrentTurn={
                    gameState.activePlayerId === opponentPlayer.playerId
                  }
                  disabled
                />
              </motion.div>

              {/* Center divider - battle zone */}
              <div className="flex items-center gap-4 py-0.5">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="relative">
                  <span className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">
                    VS
                  </span>
                  {/* Active turn glow on VS */}
                  <div
                    className={cn(
                      "absolute -inset-3 rounded-full blur-xl transition-opacity duration-700",
                      isMyTurn
                        ? "bg-emerald-500/10 opacity-100"
                        : "bg-red-500/10 opacity-50",
                    )}
                  />
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>

              {/* Player field */}
              <motion.div
                className="relative"
                animate={
                  attackFlash === "player"
                    ? { scale: [1, 1.01, 1] }
                    : {}
                }
                transition={{ duration: 0.3 }}
              >
                {/* Active glow when it's our turn */}
                {isMyTurn && (
                  <div className="absolute -inset-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 -z-10 animate-pulse" />
                )}

                <PlayerField
                  player={viewerPlayer}
                  isCurrentTurn={isMyTurn}
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
                  highlightedEmptyBench={
                    interaction.mode === "placing_pokemon"
                  }
                  disabled={!canAct && interaction.mode === "idle"}
                />

                {/* Attack panel overlay */}
                <AnimatePresence>
                  {interaction.mode === "choosing_attack" &&
                    viewerPlayer.active && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{
                          type: "spring",
                          damping: 20,
                          stiffness: 300,
                        }}
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
              </motion.div>
            </div>
          </div>
        </div>

        {/* Attack flash overlay */}
        <AnimatePresence>
          {attackFlash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute inset-0 pointer-events-none z-10",
                attackFlash === "player"
                  ? "bg-emerald-500/10"
                  : "bg-red-500/10",
              )}
            />
          )}
        </AnimatePresence>

        {/* Event log (floating, right side) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-48 max-h-60 overflow-y-auto z-20 bg-black/50 rounded-xl p-2.5 backdrop-blur-sm border border-white/5">
          <div className="text-[8px] uppercase text-white/30 tracking-wider mb-1.5 font-bold flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            Événements
          </div>
          <AnimatePresence initial={false}>
            {recentLog.slice(-8).map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[10px] text-white/40 py-0.5 border-b border-white/5 last:border-0 flex items-center gap-1.5"
              >
                {getEventIcon(entry)}
                <span>{formatLogEntry(entry)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {recentLog.length === 0 && (
            <div className="text-[10px] text-white/20">
              Aucun événement
            </div>
          )}
        </div>

        {/* Turn banner overlay */}
        <TurnBanner
          activePlayerId={gameState.activePlayerId}
          enginePlayerId={enginePlayerId}
          turnNumber={gameState.turnNumber}
        />
      </div>

      {/* ═══════════ HAND BAR ═══════════ */}
      <div className="relative z-30 bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900/80 backdrop-blur-sm border-t border-white/10">
        <HandBar
          hand={viewerPlayer.hand || []}
          selectedCardId={interaction.selectedHandCard?.instanceId ?? null}
          onCardClick={interaction.selectHandCard}
          disabled={!canAct}
        />
      </div>

      {/* ═══════════ ACTION BAR ═══════════ */}
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

      {/* ═══════════ VICTORY / DEFEAT OVERLAY ═══════════ */}
      <AnimatePresence>
        {winnerLabel && sessionStatus === "FINISHED" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-md"
          >
            {/* Confetti for victory */}
            {winnerLabel === "Victoire" &&
              confettiParticles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{
                    opacity: 1,
                    y: -20,
                    x: `${p.x}vw`,
                    rotate: 0,
                  }}
                  animate={{
                    y: "110vh",
                    rotate: 360 * (p.id % 2 === 0 ? 1 : -1),
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: p.duration,
                    delay: p.delay,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className={cn(
                    "absolute top-0 rounded-sm",
                    p.color,
                  )}
                  style={{
                    width: p.size,
                    height: p.size * 0.6,
                    left: `${p.x}%`,
                  }}
                />
              ))}

            {/* Defeat shake */}
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={
                winnerLabel === "Défaite"
                  ? {
                      scale: 1,
                      y: 0,
                      x: [0, -3, 3, -2, 2, 0],
                    }
                  : { scale: 1, y: 0 }
              }
              transition={{ type: "spring", damping: 15 }}
              className="text-center space-y-4 relative z-10"
            >
              <motion.h2
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  damping: 10,
                  delay: 0.2,
                }}
                className={cn(
                  "text-6xl font-black tracking-tight",
                  winnerLabel === "Victoire"
                    ? "text-yellow-400 drop-shadow-[0_0_40px_rgba(250,204,21,0.5)]"
                    : "text-red-400 drop-shadow-[0_0_40px_rgba(248,113,113,0.5)]",
                )}
              >
                {winnerLabel === "Victoire"
                  ? "VICTOIRE !"
                  : "DÉFAITE"}
              </motion.h2>

              {gameState.winnerReason && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-white/60 text-sm"
                >
                  {formatWinReason(gameState.winnerReason)}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                {footerCard}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────── Helpers ───────── */

function getEventIcon(entry: OnlineMatchLogEntry) {
  const type = String(entry.payload.type || "");
  if (type.includes("ATTACK"))
    return <Swords className="w-2.5 h-2.5 text-red-400/60 flex-shrink-0" />;
  if (type.includes("ENERGY") || type.includes("ATTACH"))
    return <Zap className="w-2.5 h-2.5 text-yellow-400/60 flex-shrink-0" />;
  if (type.includes("POKEMON") || type.includes("EVOLVE"))
    return (
      <Shield className="w-2.5 h-2.5 text-blue-400/60 flex-shrink-0" />
    );
  return (
    <div className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
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
