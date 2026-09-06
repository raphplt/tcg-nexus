import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export enum RoundControlAction {
  START = "START",
  PAUSE = "PAUSE",
  RESUME = "RESUME",
  EXTEND = "EXTEND",
}

/**
 * DTO for dropping a player from a tournament.
 */
export class DropPlayerDto {
  @ApiPropertyOptional({
    description: "Player ID to drop. Defaults to the requesting user's registered player if omitted.",
    example: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  playerId?: number;

  @ApiPropertyOptional({
    description: "Reason for dropping out of the tournament.",
    example: "Schedule conflict / illness",
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for round clock management actions.
 */
export class RoundControlDto {
  @ApiProperty({
    description: "Round clock action to perform.",
    enum: RoundControlAction,
    example: RoundControlAction.START,
  })
  @IsEnum(RoundControlAction)
  action: RoundControlAction;

  @ApiPropertyOptional({
    description: "Round duration in minutes (used for START).",
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: "Extension duration in minutes (used for EXTEND).",
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  extensionMinutes?: number;

  @ApiPropertyOptional({
    description: "Administrative reason for pause, extension, or manual start.",
    example: "Technical malfunction at table 3",
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for previewing the effects of a match score correction on tournament standings.
 */
export class ScoreCorrectionPreviewDto {
  @ApiProperty({
    description: "Match ID to correct.",
    example: 42,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  matchId: number;

  @ApiProperty({
    description: "Corrected score for Player A.",
    example: 2,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  playerAScore: number;

  @ApiProperty({
    description: "Corrected score for Player B.",
    example: 1,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  playerBScore: number;

  @ApiProperty({
    description: "Mandatory reason for the score correction.",
    example: "Table slip was recorded in reverse by players",
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

/**
 * DTO for applying an audited score correction.
 */
export class ScoreCorrectionApplyDto extends ScoreCorrectionPreviewDto {}
