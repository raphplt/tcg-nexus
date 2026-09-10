import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

/**
 * Payload for creating a new player profile.
 */
export class CreatePlayerDto {
  @ApiPropertyOptional({
    description: "Experience points",
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  xp?: number;

  @ApiPropertyOptional({ description: "Player level", example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({
    description: "Competitive ELO rating",
    example: 1000,
    default: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  elo?: number;

  @ApiPropertyOptional({ description: "Associated user ID", example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;
}
