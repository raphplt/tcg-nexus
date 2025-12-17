import { ApiProperty } from '@nestjs/swagger';

class DistributionEntryDto {
  @ApiProperty()
  label: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  percentage: number;
}

class AttackCostDistributionDto {
  @ApiProperty()
  cost: number;

  @ApiProperty()
  count: number;

  @ApiProperty()
  percentage: number;
}

class DuplicateCardIssueDto {
  @ApiProperty()
  cardId: string;

  @ApiProperty()
  cardName: string;

  @ApiProperty()
  qty: number;
}

class MissingCardSuggestionDto {
  @ApiProperty()
  label: string;

  @ApiProperty()
  reason: string;

  @ApiProperty()
  recommendedQty: number;
}

export class AnalyzeDeckResultDto {
  @ApiProperty()
  deckId: number;

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

  @ApiProperty({ type: [DistributionEntryDto] })
  typeDistribution: DistributionEntryDto[];

  @ApiProperty({ type: [DistributionEntryDto] })
  categoryDistribution: DistributionEntryDto[];

  @ApiProperty({ type: [AttackCostDistributionDto] })
  attackCostDistribution: AttackCostDistributionDto[];

  @ApiProperty({ type: [DuplicateCardIssueDto] })
  duplicates: DuplicateCardIssueDto[];

  @ApiProperty({ type: [String] })
  warnings: string[];

  @ApiProperty({ type: [String] })
  suggestions: string[];

  @ApiProperty({ type: [MissingCardSuggestionDto] })
  missingCards: MissingCardSuggestionDto[];
}

export type {
  DistributionEntryDto,
  AttackCostDistributionDto,
  DuplicateCardIssueDto,
  MissingCardSuggestionDto
};
