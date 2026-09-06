import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Individual player standing with explicit tiebreakers and explanation (TRN-04).
 */
export class ExplainableStandingDto {
  @ApiProperty({ description: "Rang actuel", example: 1 })
  rank: number;

  @ApiProperty({ description: "ID du joueur", example: 12 })
  playerId: number;

  @ApiProperty({ description: "Nom d'affichage du joueur", example: "Red" })
  playerName: string;

  @ApiProperty({ description: "Points de match totaux", example: 9 })
  points: number;

  @ApiProperty({ description: "Nombre de victoires", example: 3 })
  wins: number;

  @ApiProperty({ description: "Nombre de défaites", example: 0 })
  losses: number;

  @ApiProperty({ description: "Nombre d'égalités", example: 0 })
  draws: number;

  @ApiProperty({ description: "Nombre de byes", example: 0 })
  byes: number;

  @ApiProperty({ description: "Pourcentage de victoire direct", example: 100 })
  winRate: number;

  @ApiProperty({
    description: "Opponent Match Win Rate (OMW%) - premier départage officiel",
    example: 66.667,
  })
  omwPercentage: number;

  @ApiProperty({
    description: "Game Win Rate (GW%) - second départage officiel",
    example: 85.714,
  })
  gwPercentage: number;

  @ApiProperty({
    description: "Opponent Game Win Rate (OGW%) - troisième départage officiel",
    example: 60.0,
  })
  ogwPercentage: number;

  @ApiProperty({
    description: "Indique si le classement est provisoire (ronde en cours)",
    example: false,
  })
  isProvisional: boolean;

  @ApiPropertyOptional({
    description: "Explication lisible du critère de départage pour ce rang",
    example: "Départagé par OMW% supérieur (66.7% vs 55.6%)",
  })
  tiebreakExplanation?: string;
}

/**
 * Response payload for tournament explainable standings endpoint (TRN-04).
 */
export class ExplainableStandingsResponseDto {
  @ApiProperty({ description: "ID du tournoi" })
  tournamentId: number;

  @ApiProperty({ description: "Nom du tournoi" })
  tournamentName: string;

  @ApiProperty({ description: "Ronde actuelle" })
  currentRound: number;

  @ApiProperty({ description: "Nombre total de rondes prévues" })
  totalRounds: number;

  @ApiProperty({ description: "Indique si le tournoi est terminé" })
  isFinished: boolean;

  @ApiProperty({
    description: "Version des règles officielles appliquées",
    example: "POKEMON_SWISS_TIEBREAK_V1",
  })
  ruleVersion: string;

  @ApiProperty({
    description: "Date/heure de génération du classement",
  })
  generatedAt: Date;

  @ApiProperty({
    type: [ExplainableStandingDto],
    description: "Liste ordonnée des classements",
  })
  standings: ExplainableStandingDto[];
}
