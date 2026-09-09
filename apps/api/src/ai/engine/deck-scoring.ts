import { DeckCardRoleTag } from "./card-roles";
import { DiagnosticCode } from "./deck-diagnostics";
import type { EvolutionLine } from "./evolution-lines";

/** Dimensions the deck is scored on. */
export enum DeckScoreKey {
  Legality = "legality",
  Consistency = "consistency",
  Energy = "energy",
  Curve = "curve",
  Evolution = "evolution",
  Focus = "focus",
}

/** Outcome of the legality check, including "we could not check". */
export type LegalityOutcome =
  | "valid"
  | "invalid"
  | "unverified"
  | "not-checked";

/** One rule's effect on a dimension, expressed in points. */
export interface ScoreContribution {
  /** Diagnostic code when a rule fired, or a plain reason key otherwise. */
  reason: DiagnosticCode | string;
  /** Signed points applied to the dimension, relative to a base of 100. */
  delta: number;
}

/** A single scored dimension and the rules that moved it. */
export interface DeckScore {
  key: DeckScoreKey;
  /** 0-100, or null when the dimension could not be evaluated. */
  value: number | null;
  /** Share of the global score; 0 when the dimension is excluded. */
  weight: number;
  contributions: ScoreContribution[];
}

/** Every scored dimension plus the weighted global score. */
export interface DeckScoreBoard {
  /** 0-100 weighted average of the evaluated dimensions. */
  global: number;
  /**
   * Share of non-basic-energy cards whose effects the engine could read.
   * A low value means the consistency dimension rests on partial data.
   */
  confidence: number;
  breakdown: DeckScore[];
}

/** Facts the scorer needs; all of them are produced by the metrics service. */
export interface ScoringFacts {
  totalCards: number;
  pokemonCount: number;
  energyCount: number;
  energyPercentage: number;
  averageEnergyCost: number;
  averageRetreatCost: number;
  roleCounts: Record<DeckCardRoleTag, number>;
  typeCount: number;
  evolutionLines: EvolutionLine[];
  legality: LegalityOutcome;
  copyLimitBreaches: number;
  effectsCoveragePercentage: number;
}

const WEIGHTS: Record<DeckScoreKey, number> = {
  [DeckScoreKey.Legality]: 0.25,
  [DeckScoreKey.Consistency]: 0.25,
  [DeckScoreKey.Energy]: 0.2,
  [DeckScoreKey.Curve]: 0.15,
  [DeckScoreKey.Evolution]: 0.1,
  [DeckScoreKey.Focus]: 0.05,
};

/** Copies of a draw card below which the hand is expected to dry up. */
const DRAW_TARGET = 6;
/** Copies of a search card below which finding a piece is unreliable. */
const SEARCH_TARGET = 4;
/** Official list size; anything else is not a playable list. */
const REQUIRED_DECK_SIZE = 60;

const clamp = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

/** Applies contributions to a base of 100 and clamps the result. */
const settle = (contributions: ScoreContribution[]): number =>
  clamp(100 + contributions.reduce((sum, entry) => sum + entry.delta, 0));

const scoreLegality = (facts: ScoringFacts): DeckScore => {
  const contributions: ScoreContribution[] = [];

  if (facts.legality === "not-checked") {
    return {
      key: DeckScoreKey.Legality,
      value: null,
      weight: 0,
      contributions: [{ reason: "no-format", delta: 0 }],
    };
  }

  if (facts.legality === "invalid") {
    contributions.push({ reason: DiagnosticCode.LegalityInvalid, delta: -90 });
  } else if (facts.legality === "unverified") {
    contributions.push({
      reason: DiagnosticCode.LegalityUnverified,
      delta: -45,
    });
  }

  return {
    key: DeckScoreKey.Legality,
    value: settle(contributions),
    weight: WEIGHTS[DeckScoreKey.Legality],
    contributions,
  };
};

const scoreConsistency = (facts: ScoringFacts): DeckScore => {
  const contributions: ScoreContribution[] = [];

  if (facts.totalCards !== REQUIRED_DECK_SIZE) {
    contributions.push({
      reason:
        facts.totalCards < REQUIRED_DECK_SIZE
          ? DiagnosticCode.DeckSizeUnder
          : DiagnosticCode.DeckSizeOver,
      delta: -20,
    });
  }

  const draw = facts.roleCounts[DeckCardRoleTag.Draw] ?? 0;
  if (draw < DRAW_TARGET) {
    contributions.push({
      reason: DiagnosticCode.DrawEngineWeak,
      delta: -(DRAW_TARGET - draw) * 5,
    });
  }

  const search = facts.roleCounts[DeckCardRoleTag.Search] ?? 0;
  if (search < SEARCH_TARGET) {
    contributions.push({
      reason: DiagnosticCode.SearchEngineWeak,
      delta: -(SEARCH_TARGET - search) * 4,
    });
  }

  if ((facts.roleCounts[DeckCardRoleTag.Recovery] ?? 0) === 0) {
    contributions.push({ reason: DiagnosticCode.NoRecovery, delta: -8 });
  }

  if ((facts.roleCounts[DeckCardRoleTag.Switch] ?? 0) === 0) {
    contributions.push({ reason: DiagnosticCode.NoSwitch, delta: -8 });
  }

  if (facts.copyLimitBreaches > 0) {
    contributions.push({
      reason: DiagnosticCode.CopyLimitExceeded,
      delta: -Math.min(45, facts.copyLimitBreaches * 15),
    });
  }

  return {
    key: DeckScoreKey.Consistency,
    value: settle(contributions),
    weight: WEIGHTS[DeckScoreKey.Consistency],
    contributions,
  };
};

const scoreEnergy = (facts: ScoringFacts): DeckScore => {
  const contributions: ScoreContribution[] = [];

  if (facts.pokemonCount > 0 && facts.energyCount === 0) {
    contributions.push({ reason: DiagnosticCode.EnergyMissing, delta: -60 });
  } else if (facts.energyPercentage < 25) {
    contributions.push({
      reason: DiagnosticCode.EnergyTooLow,
      delta: -Math.min(40, (25 - facts.energyPercentage) * 2),
    });
  } else if (facts.energyPercentage > 35) {
    contributions.push({
      reason: DiagnosticCode.EnergyTooHigh,
      delta: -Math.min(40, (facts.energyPercentage - 35) * 2),
    });
  }

  const acceleration =
    facts.roleCounts[DeckCardRoleTag.EnergyAcceleration] ?? 0;
  if (facts.averageEnergyCost > 2.5 && acceleration === 0) {
    contributions.push({
      reason: DiagnosticCode.HighCostNoAcceleration,
      delta: -20,
    });
  }

  return {
    key: DeckScoreKey.Energy,
    value: settle(contributions),
    weight: WEIGHTS[DeckScoreKey.Energy],
    contributions,
  };
};

const scoreCurve = (facts: ScoringFacts): DeckScore => {
  const contributions: ScoreContribution[] = [];

  if (facts.averageEnergyCost > 0) {
    const distance = Math.abs(facts.averageEnergyCost - 2);
    if (distance > 0.25) {
      contributions.push({
        reason: "attack-cost-distance",
        delta: -Math.min(60, Math.round(distance * 20)),
      });
    }
  }

  if (facts.averageRetreatCost > 2) {
    contributions.push({ reason: "heavy-retreat", delta: -15 });
  }

  return {
    key: DeckScoreKey.Curve,
    value: settle(contributions),
    weight: WEIGHTS[DeckScoreKey.Curve],
    contributions,
  };
};

const scoreEvolution = (facts: ScoringFacts): DeckScore => {
  const contributions: ScoreContribution[] = [];

  const orphans = facts.evolutionLines.filter(
    (line) => line.issue === "orphan",
  ).length;
  if (orphans > 0) {
    contributions.push({
      reason: DiagnosticCode.EvolutionOrphan,
      delta: -Math.min(80, orphans * 25),
    });
  }

  const underSupported = facts.evolutionLines.filter(
    (line) => line.issue === "under-supported",
  ).length;
  if (underSupported > 0) {
    contributions.push({
      reason: DiagnosticCode.EvolutionUnderSupported,
      delta: -Math.min(40, underSupported * 10),
    });
  }

  return {
    key: DeckScoreKey.Evolution,
    value: settle(contributions),
    weight: WEIGHTS[DeckScoreKey.Evolution],
    contributions,
  };
};

const scoreFocus = (facts: ScoringFacts): DeckScore => {
  const contributions: ScoreContribution[] = [];

  if (facts.typeCount > 2) {
    contributions.push({
      reason: DiagnosticCode.TypeSpread,
      delta: -Math.min(75, (facts.typeCount - 2) * 25),
    });
  }

  return {
    key: DeckScoreKey.Focus,
    value: settle(contributions),
    weight: WEIGHTS[DeckScoreKey.Focus],
    contributions,
  };
};

/**
 * Scores a deck on every dimension and derives the weighted global score.
 *
 * Each dimension starts at 100 and only moves through named contributions, so
 * any score can be traced back to the rules that produced it. A dimension that
 * could not be evaluated carries a null value and a zero weight, and the global
 * score is renormalized over the dimensions that remain.
 *
 * @param facts Metrics produced by the deck metrics service.
 * @returns Scoreboard with the global score and its full breakdown.
 */
export function scoreDeck(facts: ScoringFacts): DeckScoreBoard {
  const breakdown = [
    scoreLegality(facts),
    scoreConsistency(facts),
    scoreEnergy(facts),
    scoreCurve(facts),
    scoreEvolution(facts),
    scoreFocus(facts),
  ];

  const evaluated = breakdown.filter(
    (score): score is DeckScore & { value: number } =>
      score.value !== null && score.weight > 0,
  );
  const totalWeight = evaluated.reduce((sum, score) => sum + score.weight, 0);

  const global = totalWeight
    ? clamp(
        evaluated.reduce((sum, score) => sum + score.value * score.weight, 0) /
          totalWeight,
      )
    : 0;

  return {
    global,
    confidence: Math.round(facts.effectsCoveragePercentage),
    breakdown,
  };
}
