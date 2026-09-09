export interface DistributionEntry {
  label: string;
  count: number;
  percentage: number;
}

export interface AttackCostDistribution {
  cost: number;
  count: number;
  percentage: number;
}

export interface DuplicateCardIssue {
  cardId: string;
  cardName: string;
  qty: number;
}

export interface MissingCardSuggestion {
  label: string;
  reason: string;
  recommendedQty: number;
}

/** Functional role a card fills, derived from its parsed effects. */
export type DeckRoleTag =
  | "draw"
  | "search"
  | "energy-acceleration"
  | "recovery"
  | "switch"
  | "disruption"
  | "healing";

export interface DeckRoleCount {
  role: DeckRoleTag;
  /** Copies, not distinct cards. */
  count: number;
  cardIds: string[];
}

export interface DeckEvolutionLine {
  base: string;
  evolution: string;
  baseQty: number;
  evolutionQty: number;
  /** Null when the line is correctly supported. */
  issue: "orphan" | "under-supported" | null;
  cardIds: string[];
}

/** `not-checked` when the deck has no format; never presented as valid. */
export type DeckLegalityStatus =
  | "valid"
  | "invalid"
  | "unverified"
  | "not-checked";

export interface DeckLegalityReport {
  status: DeckLegalityStatus;
  ruleVersion?: string;
  format?: string;
  errors: string[];
  /** Rules that could not be checked from stored data. */
  unknowns: string[];
}

export type DeckScoreKey =
  | "legality"
  | "consistency"
  | "energy"
  | "curve"
  | "evolution"
  | "focus";

export interface ScoreContribution {
  reason: string;
  delta: number;
}

export interface DeckScoreDimension {
  key: DeckScoreKey;
  /** Null when the dimension could not be evaluated. */
  value: number | null;
  weight: number;
  contributions: ScoreContribution[];
}

export interface DeckScoreBoard {
  global: number;
  /** Share of cards whose effects the engine could read, 0-100. */
  confidence: number;
  breakdown: DeckScoreDimension[];
}

export type DiagnosticSeverity = "error" | "warning" | "info";

export type DiagnosticCategory =
  | "legality"
  | "energy"
  | "consistency"
  | "evolution"
  | "focus"
  | "coverage";

export interface DeckDiagnostic {
  code: string;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  params: Record<string, string | number>;
  /** Already rendered in the request locale by the API. */
  message: string;
  cardIds?: string[];
}

export interface EffectsCoverage {
  withEffects: number;
  expected: number;
  percentage: number;
}

export interface DeckAnalysis {
  deckId?: number;
  engineVersion: string;
  totalCards: number;
  pokemonCount: number;
  energyCount: number;
  trainerCount: number;
  energyToPokemonRatio: number;
  averageEnergyCost: number;
  averageRetreatCost: number;
  typeDistribution: DistributionEntry[];
  categoryDistribution: DistributionEntry[];
  attackCostDistribution: AttackCostDistribution[];
  duplicates: DuplicateCardIssue[];
  roles: DeckRoleCount[];
  effectsCoverage: EffectsCoverage;
  evolutionLines: DeckEvolutionLine[];
  legality: DeckLegalityReport;
  scores: DeckScoreBoard;
  diagnostics: DeckDiagnostic[];
  warnings: string[];
  suggestions: string[];
  missingCards: MissingCardSuggestion[];
}

/** Why a similarity result may be empty. */
export type SimilarityUnavailableReason =
  | "pgvector-missing"
  | "deck-not-vectorized"
  | "no-neighbours";

export interface SimilarityResult<T> {
  available: boolean;
  reason?: SimilarityUnavailableReason;
  items: T[];
}

export interface SimilarDeck {
  deckId: number;
  name: string;
  /** Cosine similarity, 0-1. */
  similarity: number;
  cardCount: number;
}

export interface SuggestedCard {
  cardId: string;
  name: string | null;
  image: string | null;
  deckCount: number;
  /** Share of neighbouring decks playing this card, 0-100. */
  adoption: number;
  averageQty: number;
}
