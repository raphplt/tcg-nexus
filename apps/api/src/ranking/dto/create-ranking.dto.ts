import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, Max, Min } from "class-validator";

/**
 * Payload for creating or recording tournament player standings.
 */
export class CreateRankingDto {
  @ApiProperty({ description: "Tournament ID", example: 1 })
  @IsNumber()
  tournamentId: number;

  @ApiProperty({ description: "Player ID", example: 42 })
  @IsNumber()
  playerId: number;

  @ApiPropertyOptional({ description: "Final or current rank position", example: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rank?: number;

  @ApiPropertyOptional({ description: "Total tournament match points", example: 15, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;

  @ApiPropertyOptional({ description: "Number of tournament match wins", example: 5, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wins?: number;

  @ApiPropertyOptional({ description: "Number of tournament match losses", example: 1, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  losses?: number;

  @ApiPropertyOptional({ description: "Number of tournament match draws", example: 0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  draws?: number;

  @ApiPropertyOptional({ description: "Calculated win rate percentage", example: 83.33, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  winRate?: number;
}
