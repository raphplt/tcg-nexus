"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BoosterCard } from "@/types/mini-game";
import { getCardImage } from "@/utils/images";
import {
  isCardImagePreloaded,
  preloadCardImages,
  preloadImageUrl,
} from "@/utils/miniGames/cardPreloader";

const CARD_W = 112;
const CARD_GAP = 16;
const STRIDE = CARD_W + CARD_GAP;
/** Position of the winning card in the strip. */
const WINNER_INDEX = 18;
/** Cards shown after the winner so the strip does not end on it. */
const TRAIL = 4;
const SPIN_SECONDS = 2.1;
const CARD_BACK = "/images/carte-pokemon-dos.jpg";

interface CardRouletteProps {
  /** Card the strip stops on. */
  target: BoosterCard;
  /** Cards used as filler around the target. */
  pool: BoosterCard[];
  /** Changes on every spin so the strip is rebuilt. */
  spinId: number;
  onComplete: () => void;
}

/** Eagerly rendered card thumbnail for fast-moving roulette strips. */
function StripCardImg({ card }: { card: BoosterCard }) {
  const primarySrc = getCardImage(card, "low");
  const [src, setSrc] = useState(primarySrc);

  useEffect(() => {
    setSrc(getCardImage(card, "low"));
  }, [card]);

  return (
    <img
      src={src}
      alt={card.name ?? ""}
      loading="eager"
      decoding="async"
      draggable={false}
      onError={() => {
        if (src !== CARD_BACK) setSrc(CARD_BACK);
      }}
      className="h-full w-full object-contain block select-none"
    />
  );
}

/**
 * Horizontal strip that scrolls and stops centered on `target`, case-opening
 * style. Preloads the winning card and eagerly decodes strip cards to guarantee
 * zero visual pop-in when the roulette lands.
 */
export function CardRoulette({
  target,
  pool,
  spinId,
  onComplete,
}: CardRouletteProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const [viewportWidth, setViewportWidth] = useState(640);
  const [readyToSpin, setReadyToSpin] = useState(() =>
    isCardImagePreloaded(getCardImage(target, "low")),
  );

  useEffect(() => {
    const measure = () => {
      if (viewportRef.current)
        setViewportWidth(viewportRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Preload target and pool in the background
  useEffect(() => {
    let active = true;
    if (isCardImagePreloaded(getCardImage(target, "low"))) {
      setReadyToSpin(true);
      return;
    }

    const targetUrl = getCardImage(target, "low");

    // Safety timeout: never delay the spin longer than 120ms even on slow networks
    const fallbackTimer = setTimeout(() => {
      if (active) setReadyToSpin(true);
    }, 120);

    // Eagerly preload the target and card back
    Promise.all([preloadImageUrl(targetUrl), preloadImageUrl(CARD_BACK)]).finally(
      () => {
        clearTimeout(fallbackTimer);
        if (active) setReadyToSpin(true);
      },
    );

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
    };
  }, [spinId, target]);

  const strip = useMemo(() => {
    const source = pool.length > 0 ? pool : [target];
    // Prefer cards from pool that have already finished preloading
    const preloadedPool = source.filter((c) =>
      isCardImagePreloaded(getCardImage(c, "low")),
    );
    const fillerSource = preloadedPool.length > 5 ? preloadedPool : source;

    const cards: { key: string; card: BoosterCard }[] = [];
    for (let i = 0; i < WINNER_INDEX + TRAIL + 1; i += 1) {
      const card =
        i === WINNER_INDEX
          ? target
          : fillerSource[Math.floor(Math.random() * fillerSource.length)]!;
      cards.push({ key: `${spinId}-${i}`, card });
    }

    // Trigger preloading for any filler cards in the strip that aren't yet cached
    void preloadCardImages(cards.map((item) => item.card), "low");

    return cards;
    // A new strip per spin only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinId]);

  const targetX = useMemo(() => {
    // Small jitter so the strip does not stop dead-centre every time.
    const jitter = (Math.random() - 0.5) * (CARD_W - 40);
    const winnerCenter = WINNER_INDEX * STRIDE + CARD_W / 2;
    return viewportWidth / 2 - winnerCenter + jitter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinId, viewportWidth]);

  return (
    <div ref={viewportRef} className="relative h-full w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-1 -translate-x-1/2 bg-linear-to-b from-primary/0 via-primary to-primary/0" />
      <div className="pointer-events-none absolute left-1/2 top-0 z-30 h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[9px] border-x-transparent border-t-primary" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 z-30 h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[9px] border-x-transparent border-b-primary" />

      <motion.div
        key={spinId}
        className="flex h-full w-max items-center gap-4"
        initial={{ x: 0 }}
        animate={{ x: readyToSpin ? targetX : 0 }}
        transition={{ duration: SPIN_SECONDS, ease: [0.16, 0.84, 0.24, 1] }}
        onAnimationComplete={() => onCompleteRef.current()}
      >
        {strip.map(({ key, card }) => (
          <div
            key={key}
            className="relative h-40 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-800/60 shadow-inner"
          >
            <StripCardImg card={card} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
