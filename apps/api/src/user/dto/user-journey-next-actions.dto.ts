import { ApiProperty } from "@nestjs/swagger";

/**
 * Actionable task item in the unified user journey (INT-04).
 */
export class ActionableJourneyItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    enum: [
      "CHECKOUT_PENDING",
      "RECEIPT_IMPORT_PENDING",
      "DECK_MISSING_CARDS",
      "TOURNAMENT_DECK_SUBMISSION",
      "TOURNAMENT_SCORE_REPORT",
      "TOURNAMENT_SCORE_CONFIRMATION",
      "DISPUTE_RESOLUTION_NEEDED",
    ],
  })
  type:
    | "CHECKOUT_PENDING"
    | "RECEIPT_IMPORT_PENDING"
    | "DECK_MISSING_CARDS"
    | "TOURNAMENT_DECK_SUBMISSION"
    | "TOURNAMENT_SCORE_REPORT"
    | "TOURNAMENT_SCORE_CONFIRMATION"
    | "DISPUTE_RESOLUTION_NEEDED";

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: ["HIGH", "MEDIUM", "LOW"] })
  priority: "HIGH" | "MEDIUM" | "LOW";

  @ApiProperty({ description: "Target routing URL for the user to act on" })
  actionUrl: string;

  @ApiProperty({ description: "Action button label" })
  actionLabel: string;

  @ApiProperty({ description: "Related entity type (e.g. order, tournament, deck)" })
  entityType: string;

  @ApiProperty({ description: "Related entity unique identifier" })
  entityId: string | number;
}

/**
 * Unified user journey next actions summary (INT-04).
 */
export class UserJourneyNextActionsDto {
  @ApiProperty()
  userId: number;

  @ApiProperty({ type: [ActionableJourneyItemDto] })
  actions: ActionableJourneyItemDto[];

  @ApiProperty()
  totalActionableCount: number;

  @ApiProperty()
  generatedAt: Date;
}
