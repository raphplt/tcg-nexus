import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Result DTO for transparent collection market valuation.
 */
export class CollectionValuationDto {
  @ApiProperty({ description: "Target valuation currency", example: "EUR" })
  currency: string;

  @ApiProperty({ description: "Total estimated market value based on available reference prices", example: 450.75 })
  totalEstimatedValue: number;

  @ApiProperty({ description: "Total number of physical copies in the collection", example: 120 })
  totalCopiesCount: number;

  @ApiProperty({ description: "Number of physical copies with a known market price", example: 105 })
  valuedCopiesCount: number;

  @ApiProperty({ description: "Number of physical copies without market price data", example: 15 })
  unvaluedCopiesCount: number;

  @ApiProperty({ description: "Percentage of collection items with price coverage", example: 87.5 })
  coveragePercentage: number;

  @ApiPropertyOptional({ description: "Total known acquisition cost if recorded", example: 310.0 })
  totalAcquisitionCost?: number | null;

  @ApiPropertyOptional({ description: "Unrealized gain or loss compared to acquisition cost", example: 140.75 })
  unrealizedGainLoss?: number | null;

  @ApiPropertyOptional({ description: "ROI percentage compared to acquisition cost", example: 45.4 })
  roiPercentage?: number | null;

  @ApiProperty({ description: "Sources of pricing data used", example: ["Cardmarket (trend/avg)", "TCGPlayer (market)"] })
  sources: string[];

  @ApiProperty({ description: "Timestamp of valuation computation", example: "2026-09-06T16:00:00.000Z" })
  computedAt: string;
}
