import {
  DeckAnalysis,
  DeckScoreDimension,
  DeckScoreKey,
} from "@/types/deck-analysis";

export interface DeckScore {
  key: DeckScoreKey;
  label: string;
  /** 0-100. */
  value: number;
  hint: string;
  /** Rules that moved this dimension, so the score can be explained. */
  contributions: { reason: string; delta: number }[];
}

export interface DeckScoreSummary {
  global: number;
  /** Share of cards whose effects the engine could read, 0-100. */
  confidence: number;
  scores: DeckScore[];
  /** Dimensions the API could not evaluate, e.g. legality without a format. */
  skipped: DeckScoreKey[];
}

/** Label and one-line rationale for each dimension, resolved by the caller. */
export type ScoreLabels = Record<DeckScoreKey, { label: string; hint: string }>;

/**
 * Adapts the API scoreboard for display.
 *
 * Scoring lives on the server so the deck page, the mobile app and the API all
 * report the same number; this only attaches labels and drops the dimensions
 * the API could not evaluate.
 *
 * @param analysis Deck analysis returned by the API.
 * @param labels Localized label and hint per dimension.
 * @returns Displayable summary.
 */
export function buildScoreSummary(
  analysis: DeckAnalysis,
  labels: ScoreLabels,
): DeckScoreSummary {
  const evaluated = analysis.scores.breakdown.filter(
    (dimension): dimension is DeckScoreDimension & { value: number } =>
      dimension.value !== null,
  );

  return {
    global: analysis.scores.global,
    confidence: analysis.scores.confidence,
    skipped: analysis.scores.breakdown
      .filter((dimension) => dimension.value === null)
      .map((dimension) => dimension.key),
    scores: evaluated.map((dimension) => ({
      key: dimension.key,
      label: labels[dimension.key]?.label ?? dimension.key,
      hint: labels[dimension.key]?.hint ?? "",
      value: dimension.value,
      contributions: dimension.contributions,
    })),
  };
}

export function scoreTone(score: number): "good" | "warn" | "bad" {
  if (score >= 75) return "good";
  if (score >= 50) return "warn";
  return "bad";
}
