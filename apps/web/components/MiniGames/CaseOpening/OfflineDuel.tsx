"use client";

import { Loader2, Package, Play, RotateCcw, Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useReducer } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { BoosterCard } from "@/types/mini-game";
import { bestPull, cardValue } from "@/utils/miniGames/booster";
import { useCardImagePreloader } from "@/utils/miniGames/cardPreloader";
import { formatEuro } from "@/utils/miniGames/pricing";
import { CardRoulette } from "./CardRoulette";
import { duelReducer, initialDuelState, type Side } from "./duelReducer";
import { PlayerBoard } from "./PlayerBoard";
import { RevealTray } from "./RevealTray";
import { usePackReveal } from "./usePackReveal";

interface OfflineDuelProps {
  mode: "solo" | "local";
  /** `packs[round][player]` as drawn by the API. */
  packs: BoosterCard[][][];
  onReplay: () => void;
  onBack: () => void;
  onScoresChange?: (scores: Record<Side, number>) => void;
}

const COMPUTER_DELAY_MS = 900;

/**
 * Solo and local duels. Player 1 opens, then player 2 (the computer in solo,
 * a second person in local), round after round. Boosters come pre-drawn from
 * the API so both modes share the same draw as the online duel.
 */
export function OfflineDuel({
  mode,
  packs,
  onReplay,
  onBack,
  onScoresChange,
}: OfflineDuelProps) {
  const t = useTranslations("CaseOpening");
  const tc = useTranslations("MiniGames.common");
  const locale = useLocale();
  const [state, dispatch] = useReducer(
    duelReducer,
    packs.length,
    initialDuelState,
  );
  const reveal = usePackReveal();

  const pool = useMemo(() => packs.flat(2), [packs]);
  useCardImagePreloader(pool, "low");
  const packSize = packs[0]?.[0]?.length ?? 6;

  const name = (side: Side) =>
    side === "p1"
      ? mode === "solo"
        ? tc("me")
        : t("player1")
      : mode === "solo"
        ? t("computer")
        : t("player2");

  useEffect(() => {
    onScoresChange?.(state.scores);
  }, [state.scores, onScoresChange]);

  const open = useCallback(() => {
    if (state.stage !== "idle") return;
    const cards = packs[state.round - 1]?.[state.active === "p1" ? 0 : 1] ?? [];
    dispatch({ type: "open", cards });
    reveal.start(cards, () => dispatch({ type: "opened" }));
  }, [packs, reveal, state.active, state.round, state.stage]);

  // The computer opens on its own once the player's booster is on the board.
  useEffect(() => {
    if (mode !== "solo" || state.stage !== "idle" || state.active !== "p2")
      return;
    const timer = setTimeout(open, COMPUTER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [mode, open, state.active, state.stage]);

  const allCards = useMemo(
    () => [...state.packs.p1.flat(), ...state.packs.p2.flat()],
    [state.packs],
  );
  const best = bestPull(allCards);

  return (
    <div className="space-y-8 pt-4">
      <Card className="relative flex h-52 items-center overflow-hidden rounded-xl border border-border bg-zinc-950/80 p-4 shadow-lg backdrop-blur-md dark:bg-zinc-950/60">
        {reveal.spinning ? (
          <CardRoulette
            target={reveal.spinning.card}
            pool={pool}
            spinId={reveal.spinning.spinId}
            onComplete={reveal.onSpinComplete}
          />
        ) : state.stage === "finished" ? (
          <div className="w-full space-y-3 py-6 text-center">
            <Trophy className="mx-auto h-12 w-12 text-primary" />
            <h3 className="text-xl font-bold text-white">{t("duelOver")}</h3>
            <p className="text-sm font-bold text-zinc-300">
              {state.scores.p1 === state.scores.p2 ? (
                <span className="text-amber-500">{t("perfectTie")}</span>
              ) : (
                <span
                  className={
                    state.scores.p1 > state.scores.p2
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {t("playerVictory", {
                    player: name(
                      state.scores.p1 > state.scores.p2 ? "p1" : "p2",
                    ),
                  })}
                </span>
              )}
            </p>
            {best ? (
              <p className="text-xs text-zinc-400">
                {t("bestPull", {
                  name: best.name ?? "",
                  value: formatEuro(cardValue(best), locale),
                })}
              </p>
            ) : null}
            <div className="flex justify-center gap-4 pt-1">
              <Button
                onClick={onBack}
                variant="outline"
                className="text-foreground"
              >
                {tc("back")}
              </Button>
              <Button onClick={onReplay} className="font-semibold">
                <RotateCcw className="mr-2 h-4 w-4" />
                {tc("replay")}
              </Button>
            </div>
          </div>
        ) : state.stage === "opening" ? (
          <div className="flex w-full items-center justify-center gap-2 py-8 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("opening")}
          </div>
        ) : mode === "solo" && state.active === "p2" ? (
          <div className="flex w-full flex-col items-center justify-center gap-2 py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold text-white">
              {t("computerOpening")}
            </p>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-2 py-8 text-center">
            <Package className="h-10 w-10 animate-bounce text-primary" />
            <p className="text-sm font-semibold tracking-wide text-white">
              {t("readyToOpen", {
                player: name(state.active),
                round: state.round,
              })}
            </p>
          </div>
        )}
      </Card>

      <RevealTray
        revealed={reveal.revealed}
        packSize={packSize}
        active={reveal.spinning !== null}
      />

      {state.stage === "idle" && !(mode === "solo" && state.active === "p2") ? (
        <div className="flex justify-center">
          <Button
            onClick={open}
            className="h-14 px-10 text-lg font-semibold shadow-md"
          >
            <Play className="mr-2 h-5 w-5 fill-current" />
            {mode === "local"
              ? t("openBoosterFor", {
                  player: name(state.active),
                  round: state.round,
                })
              : t("openBooster", { round: state.round })}
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 pt-2 md:grid-cols-2">
        <PlayerBoard
          name={name("p1")}
          score={state.scores.p1}
          packs={state.packs.p1}
          accent="blue"
        />
        <PlayerBoard
          name={name("p2")}
          score={state.scores.p2}
          packs={state.packs.p2}
          accent="red"
        />
      </div>
    </div>
  );
}
