import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Individual player standing with explicit tiebreakers and explanation (TRN-04).
 */
export class ExplainableStandingDto {
  @ApiProperty({ description: "Current tournament rank", example: 1 })
  rank: number;

  @ApiProperty({ description: "Player unique identifier", example: 12 })
  playerId: number;

  @ApiProperty({ description: "Player display name", example: "Red" })
  playerName: string;

  @ApiProperty({ description: "Total tournament match points", example: 9 })
  points: number;

  @ApiProperty({ description: "Number of match wins", example: 3 })
  wins: number;

  @ApiProperty({ description: "Number of match losses", example: 0 })
  losses: number;

  @ApiProperty({ description: "Number of match draws", example: 0 })
  draws: number;

  @ApiProperty({ description: "Number of awarded byes", example: 0 })
  byes: number;

  @ApiProperty({ description: "Direct match win percentage", example: 100 })
  winRate: number;

  @ApiProperty({
    description: "Opponent Match Win Rate (OMW%) - primary official tiebreaker",
    example: 66.667,
  })
  omwPercentage: number;

  @ApiProperty({
    description: "Game Win Rate (GW%) - secondary official tiebreaker",
    example: 85.714,
  })
  gwPercentage: number;

  @ApiProperty({
    description: "Opponent Game Win Rate (OGW%) - tertiary official tiebreaker",
    example: 60.0,
  })
  ogwPercentage: number;

  @ApiProperty({
    description:
      "Indicates whether standings are provisional while a round is active",
    example: false,
  })
  isProvisional: boolean;

  @ApiPropertyOptional({
    description:
      "Human-readable explanation of the tiebreaker resolution for this rank",
    example: "Broken by higher OMW% (66.7% vs 55.6%)",
  })
  tiebreakExplanation?: string;
}

/**
 * Response payload for tournament explainable standings endpoint (TRN-04).
 */
export class ExplainableStandingsResponseDto {
  @ApiProperty({ description: "Tournament unique identifier" })
  tournamentId: number;

  @ApiProperty({ description: "Tournament display name" })
  tournamentName: string;

  @ApiProperty({ description: "Current active round number" })
  currentRound: number;

  @ApiProperty({ description: "Total planned rounds" })
  totalRounds: number;

  @ApiProperty({ description: "Indicates whether tournament has finished" })
  isFinished: boolean;

  @ApiProperty({
    description: "Official rule set version applied",
    example: "POKEMON_SWISS_TIEBREAK_V1",
  })
  ruleVersion: string;

  @ApiProperty({
    description: "Timestamp when standings were calculated",
  })
  generatedAt: Date;

  @ApiProperty({
    type: [ExplainableStandingDto],
    description: "Ordered list of player standings",
  })
  standings: ExplainableStandingDto[];
}
