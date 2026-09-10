"use client";

import { motion } from "framer-motion";
import { Award, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useReducer } from "react";
import { Button } from "@/components/ui/button";
import type { JustePrixItem } from "@/types/mini-game";
import { formatEuro } from "@/utils/miniGames/pricing";
import { ItemShowcase } from "./ItemShowcase";
import { GuessInput } from "./GuessInput";

type Player = "p1" | "p2";

interface LocalState {
  round: number;
  turn: Player | "reveal" | "finished";
  guesses: { p1: number | null; p2: number | null };
  scores: { p1: number; p2: number };
}

type LocalAction =
  | { type: "guess"; value: number; price: number }
  | { type: "next"; totalRounds: number };

export const initialLocalState: LocalState = {
  round: 1,
  turn: "p1",
  guesses: { p1: null, p2: null },
  scores: { p1: 0, p2: 0 },
};

/** Winner of a round: the closest guess, `null` on a tie. */
export function closestPlayer(
  price: number,
  p1: number,
  p2: number,
): Player | null {
  const d1 = Math.abs(price - p1);
  const d2 = Math.abs(price - p2);
  if (d1 === d2) return null;
  return d1 < d2 ? "p1" : "p2";
}

/** Pure turn logic of the local duel, kept out of the component for testing. */
export function localReducer(
  state: LocalState,
  action: LocalAction,
): LocalState {
  switch (action.type) {
    case "guess": {
      if (state.turn === "p1") {
        return {
          ...state,
          turn: "p2",
          guesses: { ...state.guesses, p1: action.value },
        };
      }
      if (state.turn === "p2" && state.guesses.p1 !== null) {
        const winner = closestPlayer(
          action.price,
          state.guesses.p1,
          action.value,
        );
        return {
          ...state,
          turn: "reveal",
          guesses: { ...state.guesses, p2: action.value },
          scores: winner
            ? { ...state.scores, [winner]: state.scores[winner] + 1 }
            : state.scores,
        };
      }
      return state;
    }
    case "next": {
      if (state.turn !== "reveal") return state;
      if (state.round >= action.totalRounds)
        return { ...state, turn: "finished" };
      return {
        ...state,
        round: state.round + 1,
        turn: "p1",
        guesses: { p1: null, p2: null },
      };
    }
    default:
      return state;
  }
}

interface LocalModeProps {
  items: JustePrixItem[];
  onReplay: () => void;
  onBack: () => void;
  onScoresChange?: (scores: { p1: number; p2: number }) => void;
}

/** Two players on one device, secret guesses, closest wins the round. */
export function LocalMode({
  items,
  onReplay,
  onBack,
  onScoresChange,
}: LocalModeProps) {
  const t = useTranslations("JustePrix");
  const tc = useTranslations("MiniGames.common");
  const locale = useLocale();
  const [state, dispatch] = useReducer(localReducer, initialLocalState);
  const item = items[state.round - 1];

  const playerName = (player: Player) =>
    t(player === "p1" ? "player1" : "player2");

  const guess = (value: number) => {
    if (!item) return;
    const next = localReducer(state, {
      type: "guess",
      value,
      price: item.price,
    });
    dispatch({ type: "guess", value, price: item.price });
    if (next.scores !== state.scores) onScoresChange?.(next.scores);
  };

  if (state.turn === "finished" || !item) {
    const { p1, p2 } = state.scores;
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="tcg-surface mx-auto max-w-xl space-y-6 rounded-xl border border-border bg-card p-8 text-center shadow-md"
      >
        <Award className="mx-auto h-16 w-16 text-primary" />
        <h2 className="text-2xl font-bold tracking-tight">{t("gameOver")}</h2>
        <p className="text-sm font-semibold">{t("duelResults")}</p>
        <div className="mx-auto grid max-w-sm grid-cols-2 gap-4">
          <ScoreTile label={playerName("p1")} value={p1} accent="blue" />
          <ScoreTile label={playerName("p2")} value={p2} accent="red" />
        </div>
        <h3 className="text-lg font-bold">
          {p1 === p2 ? (
            <span className="text-amber-500">{t("perfectTie")}</span>
          ) : (
            <span className={p1 > p2 ? "text-blue-600" : "text-red-500"}>
              {t("playerVictory", {
                player: playerName(p1 > p2 ? "p1" : "p2"),
              })}
            </span>
          )}
        </h3>
        <div className="flex justify-center gap-4">
          <Button onClick={onBack} variant="outline" className="font-semibold">
            {tc("back")}
          </Button>
          <Button onClick={onReplay} className="font-semibold">
            <RotateCcw className="mr-2 h-4 w-4" />
            {tc("replay")}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 pt-4 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <ItemShowcase
          item={item}
          round={state.round}
          totalRounds={items.length}
        />
      </div>

      <div className="space-y-4 lg:col-span-7">
        {state.turn === "p1" || state.turn === "p2" ? (
          <>
            <div className="rounded-xl border border-border bg-muted p-4 text-foreground">
              <p className="text-sm font-semibold">
                {t("turnOf", { player: playerName(state.turn) })}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                {t("lookAway", {
                  player: playerName(state.turn === "p1" ? "p2" : "p1"),
                })}
              </p>
            </div>
            <GuessInput
              key={`${state.round}-${state.turn}`}
              secret
              placeholder={t("secretGuessPlaceholder")}
              submitLabel={t("validate")}
              onSubmit={guess}
              autoFocus
            />
          </>
        ) : (
          <RevealPanel
            price={item.price}
            p1={state.guesses.p1!}
            p2={state.guesses.p2!}
            locale={locale}
            playerName={playerName}
            isLast={state.round >= items.length}
            onNext={() => dispatch({ type: "next", totalRounds: items.length })}
          />
        )}
      </div>
    </div>
  );
}

function ScoreTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: "blue" | "red";
}) {
  const classes =
    accent === "blue"
      ? "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
      : "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400";
  return (
    <div className={`rounded-lg border p-3 ${classes}`}>
      <p className="text-xs font-bold">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function RevealPanel({
  price,
  p1,
  p2,
  locale,
  playerName,
  isLast,
  onNext,
}: {
  price: number;
  p1: number;
  p2: number;
  locale: string;
  playerName: (player: Player) => string;
  isLast: boolean;
  onNext: () => void;
}) {
  const t = useTranslations("JustePrix");
  const winner = closestPlayer(price, p1, p2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-xl border border-border bg-card p-6 text-foreground shadow-md"
    >
      <h3 className="border-b border-border pb-2 text-center text-xl font-bold">
        {t("reveal")}
      </h3>
      <div className="grid grid-cols-2 gap-4 text-center">
        {(["p1", "p2"] as const).map((player) => {
          const value = player === "p1" ? p1 : p2;
          return (
            <div key={player} className="space-y-1">
              <ScoreTile
                label={playerName(player)}
                value={formatEuro(value, locale)}
                accent={player === "p1" ? "blue" : "red"}
              />
              <p className="text-[10px] text-muted-foreground">
                {t("difference", {
                  diff: formatEuro(Math.abs(price - value), locale),
                })}
              </p>
            </div>
          );
        })}
      </div>
      <div className="rounded-lg border border-border bg-muted p-3 text-center font-semibold text-foreground">
        {t("correctPriceWas", { price: formatEuro(price, locale) })}
      </div>
      <p className="text-center text-sm font-bold">
        {winner === null ? (
          <span className="text-amber-600">{t("roundTie")}</span>
        ) : (
          <span className={winner === "p1" ? "text-blue-600" : "text-red-500"}>
            {t("playerWinsRound", { player: playerName(winner) })}
          </span>
        )}
      </p>
      <Button onClick={onNext} className="h-11 w-full font-semibold">
        {isLast ? t("viewRecap") : t("nextRound")}
      </Button>
    </motion.div>
  );
}
