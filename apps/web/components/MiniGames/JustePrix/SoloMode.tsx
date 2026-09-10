"use client";

import { motion } from "framer-motion";
import { Award, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useReducer } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JustePrixItem } from "@/types/mini-game";
import {
  formatEuro,
  type GuessDirection,
  guessDirection,
  JUSTE_PRIX_SOLO_ATTEMPTS,
  scoreSoloJustePrixRound,
} from "@/utils/miniGames/pricing";
import { ItemShowcase } from "./ItemShowcase";
import { GuessInput } from "./GuessInput";

interface Attempt {
  guess: number;
  direction: GuessDirection;
}

interface RoundRecap {
  item: JustePrixItem;
  attempts: number;
  found: boolean;
  points: number;
}

interface SoloState {
  round: number;
  attempts: Attempt[];
  status: "playing" | "success" | "fail" | "finished";
  score: number;
  recap: RoundRecap[];
}

type SoloAction =
  | { type: "guess"; value: number; item: JustePrixItem }
  | { type: "next"; totalRounds: number };

export const initialSoloState: SoloState = {
  round: 1,
  attempts: [],
  status: "playing",
  score: 0,
  recap: [],
};

/** Pure round logic of the solo mode, kept out of the component for testing. */
export function soloReducer(state: SoloState, action: SoloAction): SoloState {
  switch (action.type) {
    case "guess": {
      if (state.status !== "playing") return state;
      const direction = guessDirection(action.item.price, action.value);
      const attempts = [...state.attempts, { guess: action.value, direction }];

      if (direction === "correct") {
        const points = scoreSoloJustePrixRound(attempts.length);
        return {
          ...state,
          attempts,
          status: "success",
          score: state.score + points,
          recap: [
            ...state.recap,
            { item: action.item, attempts: attempts.length, found: true, points },
          ],
        };
      }
      if (attempts.length >= JUSTE_PRIX_SOLO_ATTEMPTS) {
        return {
          ...state,
          attempts,
          status: "fail",
          recap: [
            ...state.recap,
            { item: action.item, attempts: attempts.length, found: false, points: 0 },
          ],
        };
      }
      return { ...state, attempts };
    }
    case "next": {
      if (state.status === "playing") return state;
      if (state.round >= action.totalRounds) {
        return { ...state, status: "finished" };
      }
      return { ...state, round: state.round + 1, attempts: [], status: "playing" };
    }
    default:
      return state;
  }
}

interface SoloModeProps {
  items: JustePrixItem[];
  onReplay: () => void;
  onBack: () => void;
  /** Lets the parent display the live score in the header. */
  onScoreChange?: (score: number) => void;
}

/** Solo Juste Prix: several attempts per round with higher / lower hints. */
export function SoloMode({ items, onReplay, onBack, onScoreChange }: SoloModeProps) {
  const t = useTranslations("JustePrix");
  const tc = useTranslations("MiniGames.common");
  const locale = useLocale();
  const [state, dispatch] = useReducer(soloReducer, initialSoloState);
  const item = items[state.round - 1];

  const guess = (value: number) => {
    if (!item) return;
    const next = soloReducer(state, { type: "guess", value, item });
    dispatch({ type: "guess", value, item });
    if (next.score !== state.score) onScoreChange?.(next.score);
  };

  if (state.status === "finished" || !item) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="tcg-surface mx-auto max-w-xl space-y-6 rounded-xl border border-border bg-card p-8 text-center shadow-md"
      >
        <Award className="mx-auto h-16 w-16 text-primary" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("gameOver")}</h2>
          <p className="text-muted-foreground">
            {t("finalScore", { score: state.score })}
          </p>
        </div>
        <div className="space-y-2 text-left">
          <p className="text-xs font-bold uppercase text-muted-foreground">
            {t("recapTitle")}
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {state.recap.map((entry, index) => (
              <li
                key={`${entry.item.id}-${index}`}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="truncate font-semibold">
                  {entry.item.data.name || t("unknownName")}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatEuro(entry.item.price, locale)} ·{" "}
                  {entry.found
                    ? t("recapSuccess", { count: entry.attempts })
                    : t("recapFail")}
                </span>
                <Badge
                  className={`shrink-0 ${entry.found ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-500"} border`}
                >
                  {tc("points", { points: entry.points })}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
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
        <ItemShowcase item={item} round={state.round} totalRounds={items.length} />
      </div>

      <div className="space-y-4 lg:col-span-7">
        {state.status === "playing" ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                {t("attempts", {
                  used: state.attempts.length + 1,
                  max: JUSTE_PRIX_SOLO_ATTEMPTS,
                })}
              </p>
            </div>
            <GuessInput
              placeholder={t("guessPlaceholder")}
              submitLabel={t("guess")}
              onSubmit={guess}
              autoFocus
            />
            {state.attempts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  {t("yourAttempts")}
                </p>
                <ul className="space-y-1.5">
                  {state.attempts.map((attempt, index) => (
                    <li
                      key={`${attempt.guess}-${index}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-2 text-xs font-bold shadow-sm"
                    >
                      <span>{formatEuro(attempt.guess, locale)}</span>
                      {attempt.direction === "higher" ? (
                        <Badge className="flex items-center gap-1 border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <TrendingUp className="h-3 w-3" />
                          {t("higher")}
                        </Badge>
                      ) : (
                        <Badge className="flex items-center gap-1 border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <TrendingDown className="h-3 w-3" />
                          {t("lower")}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`space-y-4 rounded-xl border border-border p-6 shadow-md ${
              state.status === "success"
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : "bg-red-500/10 text-red-700 dark:text-red-400"
            }`}
          >
            <h3 className="text-xl font-bold">
              {state.status === "success" ? t("wellDone") : t("roundFailed")}
            </h3>
            <p className="text-sm font-semibold text-foreground">
              {t("correctPriceWas", { price: formatEuro(item.price, locale) })}
            </p>
            <p className="text-xs font-semibold">
              {state.status === "success"
                ? t("foundIn", {
                    count: state.attempts.length,
                    points: state.recap.at(-1)?.points ?? 0,
                  })
                : t("outOfAttempts", { max: JUSTE_PRIX_SOLO_ATTEMPTS })}
            </p>
            <Button
              onClick={() => dispatch({ type: "next", totalRounds: items.length })}
              variant="outline"
              className="h-11 w-full font-semibold"
            >
              {state.round < items.length ? t("nextRound") : t("viewRecap")}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
