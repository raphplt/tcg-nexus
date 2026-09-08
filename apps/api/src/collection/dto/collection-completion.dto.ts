import { ApiProperty } from "@nestjs/swagger";

/**
 * Result DTO for server-side authoritative collection completion calculation.
 */
export class CollectionCompletionDto {
  @ApiProperty({ description: "Target completion policy", example: "base" })
  policy: "base" | "master";

  @ApiProperty({
    description: "Total unique targets required by the policy",
    example: 102,
  })
  totalUniqueTargets: number;

  @ApiProperty({
    description: "Total unique targets owned by the user",
    example: 45,
  })
  ownedUniqueTargets: number;

  @ApiProperty({
    description: "Completion percentage rounded to two decimals",
    example: 44.12,
  })
  percentage: number;

  @ApiProperty({
    description: "Total physical copies owned across targets",
    example: 68,
  })
  totalCopiesCount: number;

  @ApiProperty({ description: "Total duplicate copies owned", example: 23 })
  duplicateCopiesCount: number;

  @ApiProperty({ description: "Total missing unique targets", example: 57 })
  missingCount: number;

  @ApiProperty({
    description: "Whether the collection has reached 100% completion",
    example: false,
  })
  isComplete: boolean;

  @ApiProperty({
    description: "Breakdown of targets and ownership by rarity category",
    type: Object,
  })
  rarityBreakdown: Record<string, { total: number; owned: number }>;
}
