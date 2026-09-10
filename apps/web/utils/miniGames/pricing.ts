import type { CardPricing } from "@/types/cardPokemon";

/**
 * Mirror of `apps/api/src/mini-game/mini-game-pricing.ts`.
 *
 * The API is the authority for online duels; these copies let the solo and
 * local modes apply the exact same rules without a round-trip. Keep both files
 * in sync: the unit tests pin the same expected values on each side.
 */

export const JUSTE_PRIX_ROUND_SECONDS = 20;
export const JUSTE_PRIX_MAX_ACCURACY_POINTS = 1000;
export const JUSTE_PRIX_MAX_SPEED_BONUS = 300;
/** Attempts allowed per round in solo Juste Prix. */
export const JUSTE_PRIX_SOLO_ATTEMPTS = 5;

const ZERO_POINT_DEVIATION = 0.5;

function asPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Rounds a price to the cent. */
export function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Market value of a card in euros, or `null` when no source has a usable
 * price. Never substitutes a default: callers must skip unpriced cards.
 */
export function cardMarketValue(
  card: { pricing?: CardPricing | null } | null | undefined,
): number | null {
  const cardmarket = card?.pricing?.cardmarket;
  if (cardmarket) {
    const value =
      asPositiveNumber(cardmarket.trend) ??
      asPositiveNumber(cardmarket.avg) ??
      asPositiveNumber(cardmarket.low);
    if (value !== null) return roundPrice(value);
  }

  const tcgplayer = card?.pricing?.tcgplayer;
  if (tcgplayer) {
    for (const variant of [
      tcgplayer.normal,
      tcgplayer.holofoil,
      tcgplayer.reverseHolofoil,
    ]) {
      const value =
        asPositiveNumber(variant?.marketPrice) ??
        asPositiveNumber(variant?.midPrice);
      if (value !== null) return roundPrice(value);
    }
  }

  return null;
}

/** Ten percent of the reference price, with a 20 cent floor. */
export function priceTolerance(correctPrice: number): number {
  return Math.max(correctPrice * 0.1, 0.2);
}

export function isGuessWithinTolerance(
  correctPrice: number,
  guess: number,
): boolean {
  return Math.abs(correctPrice - guess) <= priceTolerance(correctPrice);
}

export type GuessDirection = "higher" | "lower" | "correct";

/** Whether the real price is higher, lower, or within tolerance of the guess. */
export function guessDirection(
  correctPrice: number,
  guess: number,
): GuessDirection {
  if (isGuessWithinTolerance(correctPrice, guess)) return "correct";
  return guess < correctPrice ? "higher" : "lower";
}

/**
 * Points for one online Juste Prix round: accuracy up to 1000 (zero at 50 %
 * off) plus, within tolerance, a speed bonus up to 300 scaled by time left.
 */
export function scoreJustePrixGuess(
  correctPrice: number,
  guess: number | null,
  elapsedSeconds: number,
  roundSeconds: number = JUSTE_PRIX_ROUND_SECONDS,
): number {
  if (guess === null || !Number.isFinite(guess) || correctPrice <= 0) return 0;

  const deviation = Math.abs(correctPrice - guess) / correctPrice;
  const accuracy = Math.max(0, 1 - deviation / ZERO_POINT_DEVIATION);
  let points = Math.round(accuracy * JUSTE_PRIX_MAX_ACCURACY_POINTS);

  if (isGuessWithinTolerance(correctPrice, guess) && roundSeconds > 0) {
    const remaining = Math.min(
      roundSeconds,
      Math.max(0, roundSeconds - elapsedSeconds),
    );
    points += Math.round(
      (remaining / roundSeconds) * JUSTE_PRIX_MAX_SPEED_BONUS,
    );
  }

  return points;
}

/** Solo round: 100 for a first-try hit, minus 15 per extra attempt, floor 10. */
export function scoreSoloJustePrixRound(attempts: number): number {
  return Math.max(10, 100 - (Math.max(1, attempts) - 1) * 15);
}

/**
 * Parses a user-typed euro amount. Accepts a decimal comma, spaces and a
 * trailing euro sign; rejects anything that is not a positive finite number.
 */
export function parseEuroInput(raw: string): number | null {
  const cleaned = raw.replace(/[€\s]/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) && value > 0 ? roundPrice(value) : null;
}

/** Formats a euro amount for display, e.g. `12,50 €` in French. */
export function formatEuro(value: number, locale: string = "fr"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
