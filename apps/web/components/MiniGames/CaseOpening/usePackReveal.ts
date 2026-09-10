"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BoosterCard } from "@/types/mini-game";
import { preloadCardImages } from "@/utils/miniGames/cardPreloader";

export interface PackRevealState {
  /** Card currently spinning on the roulette, `null` between boosters. */
  spinning: { card: BoosterCard; spinId: number } | null;
  /** Cards already landed for the current booster. */
  revealed: BoosterCard[];
  /** Starts revealing a booster card by card. */
  start: (cards: BoosterCard[], onDone: (cards: BoosterCard[]) => void) => void;
  /** Called by the roulette when the current card has landed. */
  onSpinComplete: () => void;
  /** Forgets the current booster. */
  clear: () => void;
}

const BETWEEN_CARDS_MS = 450;
const AFTER_PACK_MS = 500;

/**
 * Drives the card-by-card reveal of one booster through the roulette: each
 * card spins, lands, joins the tray, then the next one spins. Works the same
 * whether the booster came from the REST draw or from the online session.
 */
export function usePackReveal(): PackRevealState {
  const [spinning, setSpinning] = useState<PackRevealState["spinning"]>(null);
  const [revealed, setRevealed] = useState<BoosterCard[]>([]);
  const spinningRef = useRef<PackRevealState["spinning"]>(null);
  const queueRef = useRef<BoosterCard[]>([]);
  const revealedRef = useRef<BoosterCard[]>([]);
  const spinIdRef = useRef(0);
  const onDoneRef = useRef<((cards: BoosterCard[]) => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const schedule = useCallback((fn: () => void, delay: number) => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      fn();
    }, delay);
  }, []);

  const spinNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) return;
    spinIdRef.current += 1;
    spinningRef.current = { card: next, spinId: spinIdRef.current };
    setSpinning(spinningRef.current);
  }, []);

  const start = useCallback(
    (cards: BoosterCard[], onDone: (cards: BoosterCard[]) => void) => {
      if (cards.length === 0) {
        onDone([]);
        return;
      }
      queueRef.current = [...cards];
      revealedRef.current = [];
      onDoneRef.current = onDone;
      setRevealed([]);
      void preloadCardImages(cards, "low");
      spinNext();
    },
    [spinNext],
  );

  const onSpinComplete = useCallback(() => {
    const current = spinningRef.current;
    if (!current) return;
    spinningRef.current = null;
    setSpinning(null);

    revealedRef.current = [...revealedRef.current, current.card];
    setRevealed(revealedRef.current);

    if (queueRef.current.length > 0) {
      schedule(spinNext, BETWEEN_CARDS_MS);
    } else {
      const done = onDoneRef.current;
      const cards = revealedRef.current;
      schedule(() => done?.(cards), AFTER_PACK_MS);
    }
  }, [schedule, spinNext]);

  const clear = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    queueRef.current = [];
    revealedRef.current = [];
    onDoneRef.current = null;
    spinningRef.current = null;
    setSpinning(null);
    setRevealed([]);
  }, []);

  return { spinning, revealed, start, onSpinComplete, clear };
}
