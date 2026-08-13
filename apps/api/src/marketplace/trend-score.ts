const MINIMUM_ACTIVITY_SCORE = 20;
const PRIOR_DAILY_SCORE = 1;
const PRIOR_DAYS = 7;
const MINIMUM_TREND_SCORE = -100;
const MAXIMUM_TREND_SCORE = 300;

/**
 * Calculates a stabilized activity growth percentage between two time windows.
 *
 * Low-volume samples return zero, Bayesian-style prior activity prevents tiny
 * denominators from exploding, and the result is capped to keep outliers from
 * dominating marketplace rankings.
 *
 * @param recentScore - Weighted activity accumulated in the recent window.
 * @param baseScore - Weighted activity accumulated in the baseline window.
 * @param recentDays - Duration of the recent window in days.
 * @param baseDays - Duration of the baseline window in days.
 * @returns Smoothed and bounded trend growth percentage.
 */
export function calculateStabilizedTrendScore(
  recentScore: number,
  baseScore: number,
  recentDays: number,
  baseDays: number,
): number {
  if (recentScore + baseScore < MINIMUM_ACTIVITY_SCORE) return 0;

  const recentDailyAverage =
    (recentScore + PRIOR_DAILY_SCORE * PRIOR_DAYS) / (recentDays + PRIOR_DAYS);
  const baseDailyAverage =
    (baseScore + PRIOR_DAILY_SCORE * PRIOR_DAYS) / (baseDays + PRIOR_DAYS);
  const growthPercentage =
    ((recentDailyAverage - baseDailyAverage) / baseDailyAverage) * 100;

  return Math.min(
    MAXIMUM_TREND_SCORE,
    Math.max(MINIMUM_TREND_SCORE, growthPercentage),
  );
}
