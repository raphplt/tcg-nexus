import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ActiveMatchDto {
  @ApiProperty()
  matchId: number;

  @ApiProperty()
  round: number;

  @ApiPropertyOptional()
  tableNumber?: number | null;

  @ApiPropertyOptional()
  opponentName?: string;

  @ApiPropertyOptional()
  opponentPlayerId?: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  resultStatus: string;

  @ApiProperty()
  myScore: number;

  @ApiProperty()
  opponentScore: number;

  @ApiPropertyOptional()
  pendingProposal?: {
    proposalId: number;
    proposedByMe: boolean;
    playerAScore: number;
    playerBScore: number;
    status: string;
    opponentResponse: string;
    disputeReason?: string | null;
  } | null;
}

export class DeckStatusDto {
  @ApiProperty()
  isSubmitted: boolean;

  @ApiProperty()
  isLocked: boolean;

  @ApiProperty()
  isValid: boolean;

  @ApiPropertyOptional()
  deckName?: string;

  @ApiPropertyOptional()
  deckId?: number | null;

  @ApiPropertyOptional({ type: [String] })
  validationErrors?: string[] | null;
}

/**
 * Action-oriented dashboard payload for an active tournament player (TRN-03).
 */
export class PlayerTournamentDashboardDto {
  @ApiProperty()
  tournamentId: number;

  @ApiProperty()
  tournamentName: string;

  @ApiProperty()
  tournamentStatus: string;

  @ApiProperty()
  currentRound: number;

  @ApiProperty()
  totalRounds: number;

  @ApiProperty()
  registrationStatus: string;

  @ApiProperty()
  checkedIn: boolean;

  @ApiProperty()
  isDropped: boolean;

  @ApiPropertyOptional()
  roundStartedAt?: Date | null;

  @ApiPropertyOptional()
  roundDeadline?: Date | null;

  @ApiProperty()
  isRoundPaused: boolean;

  @ApiPropertyOptional()
  remainingSeconds?: number | null;

  @ApiProperty({ type: DeckStatusDto })
  deckStatus: DeckStatusDto;

  @ApiPropertyOptional({ type: ActiveMatchDto })
  activeMatch?: ActiveMatchDto | null;

  @ApiProperty({
    description: "Next priority action required from the player",
    example: "CONFIRM_SCORE",
  })
  nextAction:
    | "SUBMIT_DECK"
    | "CHECK_IN"
    | "WAIT_FOR_PAIRINGS"
    | "PLAY_MATCH"
    | "REPORT_SCORE"
    | "CONFIRM_SCORE"
    | "AWAIT_SCORE_CONFIRMATION"
    | "DISPUTE_IN_PROGRESS"
    | "WAIT_FOR_NEXT_ROUND"
    | "TOURNAMENT_FINISHED"
    | "PLAYER_DROPPED";
}
