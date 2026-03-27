"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Shield, Swords, Zap } from "lucide-react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type {
  MatchBoardActionInput,
  MatchPromptResponseInput,
} from "@/components/match/MatchBoardView";
import { cn } from "@/lib/utils";

const sessionStatusLabels: Record<string, string> = {
  WAITING_FOR_DECKS: "En attente des decks",
  ACTIVE: "En cours",
  FINISHED: "Terminé",
};
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
  const [attackFlash, setAttackFlash] = useState<"player" | "opponent" | null>(
    null,
  );
  const prevLogLenRef = useRef(recentLog.length);

  useEffect(() => {
    if (recentLog.length > prevLogLenRef.current) {
      const newEvents = recentLog.slice(prevLogLenRef.current);
      for (const evt of newEvents) {
        const type = evt.payload.type;
        if (type === "ATTACK" || type === "attack") {
          const attackerId = evt.payload.playerId;
          setAttackFlash(attackerId === enginePlayerId ? "player" : "opponent");
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
  const mobileFeedEntries = recentLog.slice(-4).reverse();
  const desktopFeedEntries = recentLog.slice(-8).reverse();

  return (
    <div className="relative flex h-dvh select-none flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_22%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.14),transparent_24%),linear-gradient(180deg,#020617_0%,#020617_28%,#04111f_100%)]">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-[10%] top-[12%] h-56 w-56 rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="absolute bottom-[8%] right-[12%] h-64 w-64 rounded-full bg-emerald-400/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.08]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_40%)]" />
      </div>

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
      <div className="relative z-30 border-b border-white/8 bg-black/35 px-3 py-3 backdrop-blur-md md:px-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <HudPlayerChip
              name="Vous"
              prizesRemaining={viewerPlayer.prizesRemaining}
              active={isMyTurn}
              tone="emerald"
            />
            <HudPlayerChip
              name={opponentPlayer.name}
              prizesRemaining={opponentPlayer.prizesRemaining}
              active={!isMyTurn}
              tone="rose"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HudBadge>
              {sessionStatusLabels[sessionStatus] ?? sessionStatus}
            </HudBadge>
            <HudBadge>{`Tour ${gameState.turnNumber}`}</HudBadge>
            <HudBadge>{formatPhaseLabel(gameState.gamePhase)}</HudBadge>
            <HudBadge tone={isMyTurn ? "emerald" : "rose"}>
              <span className="flex items-center gap-1.5">
                {isMyTurn ? (
                  <Swords className="h-3 w-3" />
                ) : (
                  <Zap className="h-3 w-3" />
                )}
                {isMyTurn ? "Votre tour" : "Tour adverse"}
              </span>
            </HudBadge>
            {winnerLabel ? (
              <HudBadge tone={winnerLabel === "Victoire" ? "amber" : "rose"}>
                {winnerLabel}
              </HudBadge>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 xl:justify-end">
            {headerAside ? (
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75 backdrop-blur-sm">
                {headerAside}
              </div>
            ) : null}
            <PauseMenu onForfeit={onForfeit} sessionStatus={sessionStatus} />
          </div>
        </div>
      </div>

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
      <div className="relative min-h-0 flex-1 overflow-clip">
        {introCard || mobileFeedEntries.length ? (
          <div className="relative z-20 space-y-3 px-3 pt-3 lg:hidden">
            {introCard}
            <CombatFeedCard entries={mobileFeedEntries} compact />
          </div>
        ) : null}

        {introCard ? (
          <div className="absolute left-4 top-4 z-20 hidden w-[320px] lg:block">
            {introCard}
          </div>
        ) : null}

        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-2 pb-2 pt-4 sm:px-4 lg:pt-0"
        >
          <div className="relative w-full max-w-5xl">
            <div className="mx-auto w-full max-w-4xl origin-center scale-[0.72] sm:scale-[0.82] lg:scale-[0.94] xl:scale-100" style={{ perspective: "800px" }}>
              {/* Board surface */}
              <div className="relative space-y-3 overflow-clip rounded-[2rem] border border-cyan-400/12 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_35%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.14),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.96))] px-4 py-4 shadow-[0_36px_120px_-48px_rgba(2,6,23,0.95),0_-4px_30px_-10px_rgba(6,182,212,0.08)] sm:px-6 sm:py-5 [transform:rotateX(8deg)]">
                {/* Mat texture - hex pattern */}
                <div className="absolute inset-0 rounded-[2rem] opacity-[0.045] pointer-events-none">
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
                <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.07)_0%,transparent_70%)] pointer-events-none" />
                <div className="absolute inset-x-8 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300/16 to-transparent pointer-events-none" />
                <div className="absolute left-1/2 top-8 bottom-8 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/6 to-transparent pointer-events-none" />

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
                <div className="flex items-center gap-4 py-1">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="relative">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-100/25">
                      Arena
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
                    attackFlash === "player" ? { scale: [1, 1.01, 1] } : {}
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
        <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 xl:block">
          <CombatFeedCard entries={desktopFeedEntries} />
        </div>

        {/* Turn banner overlay */}
        <TurnBanner
          activePlayerId={gameState.activePlayerId}
          enginePlayerId={enginePlayerId}
          turnNumber={gameState.turnNumber}
        />
      </div>

      {/* ═══════════ HAND BAR ═══════════ */}
      <div className="relative z-30">
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
                  className={cn("absolute top-0 rounded-sm", p.color)}
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
                {winnerLabel === "Victoire" ? "VICTOIRE !" : "DÉFAITE"}
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

function HudPlayerChip({
  name,
  prizesRemaining,
  active,
  tone,
}: {
  name: string;
  prizesRemaining: number;
  active: boolean;
  tone: "emerald" | "rose";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-all",
        tone === "emerald"
          ? "border-emerald-400/20 bg-emerald-400/8 text-emerald-100"
          : "border-rose-400/20 bg-rose-400/8 text-rose-100",
        active && "shadow-[0_0_24px_rgba(255,255,255,0.06)]",
      )}
    >
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          tone === "emerald"
            ? active
              ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]"
              : "bg-emerald-300/35"
            : active
              ? "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.75)]"
              : "bg-rose-300/35",
        )}
      />
      <span className="max-w-[10rem] truncate">{name}</span>
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-200/85">
        <Shield className="h-3 w-3" />
        {prizesRemaining}
      </span>
    </div>
  );
}

function HudBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "emerald" | "rose" | "amber";
}) {
  return (
    <div
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm",
        tone === "neutral" && "border-white/10 bg-white/6 text-white/65",
        tone === "emerald" &&
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
        tone === "rose" && "border-rose-400/20 bg-rose-400/10 text-rose-200",
        tone === "amber" &&
          "border-amber-400/20 bg-amber-400/10 text-amber-200",
      )}
    >
      {children}
    </div>
  );
}

function CombatFeedCard({
  entries,
  compact = false,
}: {
  entries: OnlineMatchLogEntry[];
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "max-h-72 overflow-y-auto rounded-2xl border border-white/8 bg-black/40 p-3 backdrop-blur-md",
        compact ? "w-full" : "w-56",
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.28em] text-white/35">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Feed
      </div>
      <AnimatePresence initial={false}>
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 border-b border-white/6 py-1.5 text-[11px] text-white/52 last:border-0"
          >
            {getEventIcon(entry)}
            <span className="line-clamp-2">{formatLogEntry(entry)}</span>
          </motion.div>
        ))}
      </AnimatePresence>
      {entries.length === 0 ? (
        <div className="text-[11px] text-white/20">Aucun événement</div>
      ) : null}
    </div>
  );
}

function getEventIcon(entry: OnlineMatchLogEntry) {
  const type = String(entry.payload.type || "");
  if (type.includes("ATTACK"))
    return <Swords className="w-2.5 h-2.5 text-red-400/60 flex-shrink-0" />;
  if (type.includes("ENERGY") || type.includes("ATTACH"))
    return <Zap className="w-2.5 h-2.5 text-yellow-400/60 flex-shrink-0" />;
  if (type.includes("POKEMON") || type.includes("EVOLVE"))
    return <Shield className="w-2.5 h-2.5 text-blue-400/60 flex-shrink-0" />;
  return <div className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />;
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

function formatPhaseLabel(phase?: string | null) {
  if (!phase) return "Phase";

  const labels: Record<string, string> = {
    Setup: "Setup",
    Mulligan: "Mulligan",
    Play: "Action",
    Attack: "Attaque",
    BetweenTurns: "Entre tours",
    Finished: "Fin",
  };

  return labels[phase] ?? phase;
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
