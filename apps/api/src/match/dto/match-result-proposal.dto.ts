import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

/**
 * Payload for a player to propose a match result (TRN-01).
 */
export class ProposeMatchResultDto {
  @ApiProperty({ description: "Score proposed for player A", example: 2 })
  @IsInt()
  @Min(0)
  playerAScore: number;

  @ApiProperty({ description: "Score proposed for player B", example: 1 })
  @IsInt()
  @Min(0)
  playerBScore: number;

  @ApiPropertyOptional({
    description: "Optional comment from the proposing player",
    example: "Match completed in 3 games",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Payload for opponent to accept or dispute a proposed score (TRN-01).
 */
export class RespondMatchResultDto {
  @ApiProperty({
    description: "True to accept proposed result, false to dispute",
    example: true,
  })
  @IsBoolean()
  accept: boolean;

  @ApiPropertyOptional({
    description: "Dispute reason when contesting the score",
    example: "Opponent reported 2-0 when actual score was 1-1",
  })
  @IsOptional()
  @IsString()
  disputeReason?: string;
}

/**
 * Payload for tournament organizer/staff to resolve a disputed match result with audit (TRN-01).
 */
export class ResolveMatchDisputeDto {
  @ApiProperty({ description: "Validated final score for player A", example: 2 })
  @IsInt()
  @Min(0)
  playerAScore: number;

  @ApiProperty({ description: "Validated final score for player B", example: 0 })
  @IsInt()
  @Min(0)
  playerBScore: number;

  @ApiPropertyOptional({ description: "ID of declared winner player" })
  @IsOptional()
  @IsInt()
  winnerPlayerId?: number;

  @ApiPropertyOptional({ description: "Whether win is awarded by forfeit" })
  @IsOptional()
  @IsBoolean()
  isForfeit?: boolean;

  @ApiProperty({
    description: "Mandatory organizer justification for audit trail",
    example: "Verified physical match slip signed by both players",
  })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
