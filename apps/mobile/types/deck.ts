import { User } from "./auth";
import { CardSearchResult } from "./scan";

export interface DeckFormat {
  id: number;
  type: string;
  startDate: string;
  endDate: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export type DeckCardRole = "main" | "side";

export interface DeckCard {
  id?: number;
  qty: number;
  deck?: Deck;
  role: DeckCardRole;
  card?: CardSearchResult;
}

export interface Deck {
  id: number;
  name: string;
  user: User;
  format: DeckFormat;
  isPublic: boolean;
  views: number;
  coverCard?: {
    image: string;
    name: string;
  };
  cards?: DeckCard[];
  createdAt: string;
  updatedAt?: string;
}

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
  unknowns: string[];
}

export type DeckScoreKey =
  | "legality"
  | "consistency"
  | "energy"
  | "curve"
  | "evolution"
  | "focus";

export interface DeckScoreDimension {
  key: DeckScoreKey;
  /** Null when the dimension could not be evaluated. */
  value: number | null;
  weight: number;
  contributions: { reason: string; delta: number }[];
}

export interface DeckScoreBoard {
  global: number;
  /** Share of cards whose effects the engine could read, 0-100. */
  confidence: number;
  breakdown: DeckScoreDimension[];
}

export interface DeckDiagnostic {
  code: string;
  severity: "error" | "warning" | "info";
  category:
    | "legality"
    | "energy"
    | "consistency"
    | "evolution"
    | "focus"
    | "coverage";
  params: Record<string, string | number>;
  /** Already rendered in the request locale by the API. */
  message: string;
  cardIds?: string[];
}

export interface DeckAnalysis {
  deckId: number;
  /** Engine revision behind this payload. */
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
  effectsCoverage: {
    withEffects: number;
    expected: number;
    percentage: number;
  };
  evolutionLines: DeckEvolutionLine[];
  legality: DeckLegalityReport;
  scores: DeckScoreBoard;
  diagnostics: DeckDiagnostic[];
  warnings: string[];
  suggestions: string[];
  missingCards: MissingCardSuggestion[];
}

export interface DecksQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  formatId?: number;
  userId?: number;
  currency?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface DeckExportCardJson {
  tcgDexId: string;
  name: string;
  qty: number;
  role: string;
}

export interface DeckExportJson {
  name: string;
  format: string;
  isPublic?: boolean;
  cards: DeckExportCardJson[];
}
