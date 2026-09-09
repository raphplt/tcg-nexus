import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DeckCardRoleTag } from "../engine/card-roles";
import {
  DiagnosticCategory,
  DiagnosticCode,
  DiagnosticSeverity,
} from "../engine/deck-diagnostics";
import { DeckScoreKey, type LegalityOutcome } from "../engine/deck-scoring";
import type { EvolutionLineIssue } from "../engine/evolution-lines";

/** Count and share of a label within the deck. */
export class DistributionEntryDto {
  @ApiProperty({ example: "Fire" })
  label: string;

  @ApiProperty({ example: 12 })
  count: number;

  @ApiProperty({ description: "Share of the deck, 0-100", example: 20 })
  percentage: number;
}

/** Count and share of an attack energy cost. */
export class AttackCostDistributionDto {
  @ApiProperty({ example: 2 })
  cost: number;

  @ApiProperty({ example: 8 })
  count: number;

  @ApiProperty({ example: 25 })
  percentage: number;
}

/** A card played beyond the copy limit. */
export class DuplicateCardIssueDto {
  @ApiProperty()
  cardId: string;

  @ApiProperty()
  cardName: string;

  @ApiProperty()
  qty: number;
}

/** A gap the deck should fill, expressed as a card family. */
export class MissingCardSuggestionDto {
  @ApiProperty({ example: "Cartes de pioche" })
  label: string;

  @ApiProperty()
  reason: string;

  @ApiProperty({ example: 4 })
  recommendedQty: number;
}

/** Copies of the deck that fulfil a given functional role. */
export class DeckRoleCountDto {
  @ApiProperty({ enum: DeckCardRoleTag })
  role: DeckCardRoleTag;

  @ApiProperty({ description: "Copies, not distinct cards", example: 8 })
  count: number;

  @ApiProperty({ type: [String] })
  cardIds: string[];
}

/** One evolution step present in the deck. */
export class DeckEvolutionLineDto {
  @ApiProperty()
  base: string;

  @ApiProperty()
  evolution: string;

  @ApiProperty()
  baseQty: number;

  @ApiProperty()
  evolutionQty: number;

  @ApiProperty({
    enum: ["orphan", "under-supported"],
    nullable: true,
    description: "Null when the line is correctly supported",
  })
  issue: EvolutionLineIssue;

  @ApiProperty({ type: [String] })
  cardIds: string[];
}

/** Result of checking the deck against its format's rules. */
export class DeckLegalityReportDto {
  @ApiProperty({
    enum: ["valid", "invalid", "unverified", "not-checked"],
    description:
      "`not-checked` when the deck has no format; never presented as valid",
  })
  status: LegalityOutcome;

  @ApiPropertyOptional({
    description: "Rule set the deck was checked against",
    example: "POKEMON_STANDARD_2026",
  })
  ruleVersion?: string;

  @ApiPropertyOptional({ example: "Standard" })
  format?: string;

  @ApiProperty({ type: [String] })
  errors: string[];

  @ApiProperty({
    type: [String],
    description: "Rules that could not be checked from stored data",
  })
  unknowns: string[];
}

/** Signed points a single rule applied to a dimension. */
export class ScoreContributionDto {
  @ApiProperty({ example: "DRAW_ENGINE_WEAK" })
  reason: string;

  @ApiProperty({ example: -15 })
  delta: number;
}

/** One scored dimension and the rules that moved it. */
export class DeckScoreDto {
  @ApiProperty({ enum: DeckScoreKey })
  key: DeckScoreKey;

  @ApiProperty({
    nullable: true,
    description: "0-100, null when the dimension could not be evaluated",
  })
  value: number | null;

  @ApiProperty({ description: "Share of the global score; 0 when excluded" })
  weight: number;

  @ApiProperty({ type: [ScoreContributionDto] })
  contributions: ScoreContributionDto[];
}

/** Global score with its full, traceable breakdown. */
export class DeckScoreBoardDto {
  @ApiProperty({ example: 72 })
  global: number;

  @ApiProperty({
    description:
      "Share of non-basic-energy cards whose effects the engine could read",
    example: 88,
  })
  confidence: number;

  @ApiProperty({ type: [DeckScoreDto] })
  breakdown: DeckScoreDto[];
}

/** A rule outcome, machine-readable and pre-rendered in the request locale. */
export class DeckDiagnosticDto {
  @ApiProperty({ enum: DiagnosticCode })
  code: DiagnosticCode;

  @ApiProperty({ enum: DiagnosticSeverity })
  severity: DiagnosticSeverity;

  @ApiProperty({ enum: DiagnosticCategory })
  category: DiagnosticCategory;

  @ApiProperty({ description: "Values that triggered the rule" })
  params: Record<string, string | number>;

  @ApiProperty({ description: "Rendered in the request locale" })
  message: string;

  @ApiPropertyOptional({ type: [String] })
  cardIds?: string[];
}

/** How much of the deck the effect parser could read. */
export class EffectsCoverageDto {
  @ApiProperty({ description: "Cards carrying parsed effects" })
  withEffects: number;

  @ApiProperty({ description: "Cards expected to carry effects" })
  expected: number;

  @ApiProperty({ example: 88 })
  percentage: number;
}

/**
 * Full deterministic analysis of a deck.
 *
 * Everything here is computed locally from catalog data: no external service is
 * involved, so the payload is identical whether or not the network is up.
 */
export class DeckInsightsDto {
  @ApiPropertyOptional({
    description: "Set when analyzing a persisted deck",
    example: 42,
  })
  deckId?: number;

  @ApiProperty({
    description: "Engine revision, so cached results can be invalidated",
    example: "2",
  })
  engineVersion: string;

  @ApiProperty()
  totalCards: number;

  @ApiProperty()
  pokemonCount: number;

  @ApiProperty()
  energyCount: number;

  @ApiProperty()
  trainerCount: number;

  @ApiProperty()
  energyToPokemonRatio: number;

  @ApiProperty()
  averageEnergyCost: number;

  @ApiProperty({ description: "Average retreat cost of the deck's Pokémon" })
  averageRetreatCost: number;

  @ApiProperty({ type: [DistributionEntryDto] })
  typeDistribution: DistributionEntryDto[];

  @ApiProperty({ type: [DistributionEntryDto] })
  categoryDistribution: DistributionEntryDto[];

  @ApiProperty({ type: [AttackCostDistributionDto] })
  attackCostDistribution: AttackCostDistributionDto[];

  @ApiProperty({ type: [DuplicateCardIssueDto] })
  duplicates: DuplicateCardIssueDto[];

  @ApiProperty({ type: [DeckRoleCountDto] })
  roles: DeckRoleCountDto[];

  @ApiProperty({ type: EffectsCoverageDto })
  effectsCoverage: EffectsCoverageDto;

  @ApiProperty({ type: [DeckEvolutionLineDto] })
  evolutionLines: DeckEvolutionLineDto[];

  @ApiProperty({ type: DeckLegalityReportDto })
  legality: DeckLegalityReportDto;

  @ApiProperty({ type: DeckScoreBoardDto })
  scores: DeckScoreBoardDto;

  @ApiProperty({ type: [DeckDiagnosticDto] })
  diagnostics: DeckDiagnosticDto[];

  @ApiProperty({
    type: [String],
    description:
      "Errors and warnings rendered in the request locale, derived from `diagnostics`",
  })
  warnings: string[];

  @ApiProperty({
    type: [String],
    description:
      "Informational advice rendered in the request locale, derived from `diagnostics`",
  })
  suggestions: string[];

  @ApiProperty({ type: [MissingCardSuggestionDto] })
  missingCards: MissingCardSuggestionDto[];
}
