/**
 * Pure pricing and scoring rules shared by every mini-game surface: the
 * WebSocket gateway (online duels) and the REST controller (solo games).
 *
 * Kept free of Nest and TypeORM so the web client can mirror the exact same
 * formulas (see `apps/web/utils/miniGames/pricing.ts`) and both sides agree on
 * what a "correct" guess is worth.
 */

/** Length of a Juste Prix round, in seconds. The server is the authority. */
export const JUSTE_PRIX_ROUND_SECONDS = 20;

/** Highest score a single Juste Prix round can yield before the speed bonus. */
export const JUSTE_PRIX_MAX_ACCURACY_POINTS = 1000;

/** Speed bonus granted for a guess within tolerance, scaled by remaining time. */
export const JUSTE_PRIX_MAX_SPEED_BONUS = 300;

/** Relative deviation at which a guess stops earning any accuracy point. */
const ZERO_POINT_DEVIATION = 0.5;

/** Minimal shape of a card carrying market prices, as stored in `Card.pricing`. */
export interface PricedCardLike {
  pricing?: {
    cardmarket?: {
      trend?: number | string | null;
      avg?: number | string | null;
      low?: number | string | null;
    } | null;
    tcgplayer?: {
      normal?: TcgPlayerVariantLike | null;
      holofoil?: TcgPlayerVariantLike | null;
      reverseHolofoil?: TcgPlayerVariantLike | null;
    } | null;
  } | null;
}

interface TcgPlayerVariantLike {
  marketPrice?: number | string | null;
  midPrice?: number | string | null;
}

function asPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Market value of a card, in euros.
 *
 * Cardmarket is preferred (trend, then 30-day average, then low), TCGplayer
 * variants are the fallback. Returns `null` rather than a made-up default when
 * no source has a usable price: callers must skip such cards, never price them.
 *
 * @param card Card-like object carrying a `pricing` payload.
 * @returns Positive market value, or `null` when unknown.
 */
export function cardMarketValue(
  card: PricedCardLike | null | undefined,
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

/** Rounds a price to the cent. */
export function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Absolute tolerance within which a guess counts as "the right price".
 *
 * Ten percent of the reference price, with a floor of 20 cents so that cheap
 * cards (a 0.15 € common) stay guessable at all.
 *
 * @param correctPrice Reference price in euros.
 * @returns Tolerance in euros.
 */
export function priceTolerance(correctPrice: number): number {
  return Math.max(correctPrice * 0.1, 0.2);
}

/**
 * Whether a guess falls within {@link priceTolerance} of the reference price.
 */
export function isGuessWithinTolerance(
  correctPrice: number,
  guess: number,
): boolean {
  return Math.abs(correctPrice - guess) <= priceTolerance(correctPrice);
}

/**
 * Direction hint for a solo guess: whether the real price is higher, lower or
 * already within tolerance.
 */
export function guessDirection(
  correctPrice: number,
  guess: number,
): "higher" | "lower" | "correct" {
  if (isGuessWithinTolerance(correctPrice, guess)) return "correct";
  return guess < correctPrice ? "higher" : "lower";
}

/**
 * Points earned for one Juste Prix round.
 *
 * Accuracy is worth up to {@link JUSTE_PRIX_MAX_ACCURACY_POINTS}, decreasing
 * linearly with the relative deviation and reaching zero at 50 % off. A guess
 * within tolerance additionally earns a speed bonus proportional to the time
 * left in the round, up to {@link JUSTE_PRIX_MAX_SPEED_BONUS}.
 *
 * @param correctPrice Reference price in euros (must be positive).
 * @param guess Player's guess in euros, `null` when the round timed out.
 * @param elapsedSeconds Time taken to answer, measured server-side.
 * @param roundSeconds Round duration used to scale the speed bonus.
 * @returns Non-negative integer score.
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
    points += Math.round((remaining / roundSeconds) * JUSTE_PRIX_MAX_SPEED_BONUS);
  }

  return points;
}

/**
 * Points earned for a solo Juste Prix round, where the player has several
 * attempts and no timer: 100 for a first-try hit, minus 15 per extra attempt,
 * never below 10.
 *
 * @param attempts Number of guesses used, including the winning one.
 */
export function scoreSoloJustePrixRound(attempts: number): number {
  return Math.max(10, 100 - (Math.max(1, attempts) - 1) * 15);
}
