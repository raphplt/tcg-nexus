import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";

/**
 * Request payload for analyzing a deck composition.
 * Requires either a persisted `deckId` or an ad-hoc array of `cardIds`.
 */
export class AnalyzeDeckDto {
  /**
   * Unique identifier of an existing deck to analyze.
   */
  @ApiPropertyOptional({
    description: "Database identifier of an existing deck",
    example: 42,
  })
  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.cardIds || o.cardIds.length === 0)
  deckId?: number;

  /**
   * List of card identifiers to analyze an ad-hoc card pool.
   */
  @ApiPropertyOptional({
    description: "Array of card IDs for an ad-hoc card pool analysis",
    example: ["base1-1", "base1-4", "base1-4"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ValidateIf((o) => !o.deckId)
  cardIds?: string[];
}
