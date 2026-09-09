/**
 * Lifecycle status of a tournament match result from proposal to confirmation or dispute.
 */
export enum MatchResultStatus {
  UNREPORTED = "unreported",
  PROPOSED = "proposed",
  CONFIRMED = "confirmed",
  DISPUTED = "disputed",
}

/**
 * Status of an individual match score proposal submitted by a player.
 */
export enum ProposalStatus {
  PENDING_CONFIRMATION = "pending_confirmation",
  CONFIRMED = "confirmed",
  DISPUTED = "disputed",
  SUPERSEDED = "superseded",
  RESOLVED_BY_ORGANIZER = "resolved_by_organizer",
}

/**
 * Response of an opponent to a proposed match score.
 */
export enum OpponentResponse {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}
