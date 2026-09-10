import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

/**
 * Payload for creating or recording player match performance statistics.
 */
export class CreateStatisticDto {
  @ApiProperty({ description: "Target player identifier", example: 1 })
  @IsInt()
  @Min(1)
  playerId: number;

  @ApiProperty({ description: "Target match identifier", example: 42 })
  @IsInt()
  @Min(1)
  matchId: number;

  @ApiPropertyOptional({
    description: "Points scored in the match",
    example: 6,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @ApiPropertyOptional({
    description: "Number of aces / decisive turns",
    example: 2,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  aces?: number;

  @ApiPropertyOptional({
    description: "Number of tactical faults or penalties",
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  faults?: number;

  @ApiPropertyOptional({
    description: "Total cards played during the match",
    example: 24,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  cardsPlayed?: number;

  @ApiPropertyOptional({
    description: "Total combat damage dealt",
    example: 450,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  damageDealt?: number;

  @ApiPropertyOptional({
    description: "Total combat damage taken",
    example: 210,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  damageTaken?: number;

  @ApiPropertyOptional({
    description: "Whether this player won the match",
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isWinner?: boolean;
}
