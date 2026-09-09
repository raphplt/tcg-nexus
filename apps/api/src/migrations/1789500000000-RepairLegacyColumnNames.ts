import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Renames the columns earlier migrations created under names the entities never
 * read, and restores the availability their backfill lost (FND-04, COL-02).
 *
 * Those migrations wrote snake_case columns while the application reads
 * camelCase ones, so an installation upgraded through them carried columns no
 * query ever touched. Each rename happens only where the wrong column exists
 * and the right one does not, so a database already holding the correct schema
 * is left alone.
 */
export class RepairLegacyColumnNames1789500000000
  implements MigrationInterface
{
  name = "RepairLegacyColumnNames1789500000000";

  /**
   * Columns to rename, per table, as [written, expected].
   *
   * Exposed so the migration suite can rebuild the state these renames repair.
   */
  static readonly RENAMES: Array<[string, Array<[string, string]>]> = [
  ["collection", [["completion_policy", "completionPolicy"], ["completion_snapshot", "completionSnapshot"]]],
  ["collection_item", [["acquired_at", "acquiredAt"], ["acquisition_cost", "acquisitionCost"], ["acquisition_currency", "acquisitionCurrency"], ["photo_urls", "photoUrls"], ["quantity_available", "quantityAvailable"], ["quantity_reserved", "quantityReserved"], ["quantity_sold", "quantitySold"], ["storage_location", "storageLocation"]]],
  ["listing", [["defect_description", "defectDescription"], ["is_inventory_backed", "isInventoryBacked"], ["photo_urls", "photoUrls"]]],
  ["match", [["confirmed_at", "confirmedAt"], ["disputed_at", "disputedAt"], ["result_status", "resultStatus"], ["table_number", "tableNumber"]]],
  ["match_result_proposal", [["created_at", "createdAt"], ["dispute_reason", "disputeReason"], ["match_id", "matchId"], ["opponent_response", "opponentResponse"], ["organizer_resolution_reason", "organizerResolutionReason"], ["player_a_score", "playerAScore"], ["player_b_score", "playerBScore"], ["proposer_player_id", "proposerPlayerId"], ["proposer_user_id", "proposerUserId"], ["resolved_by_user_id", "resolvedByUserId"], ["updated_at", "updatedAt"]]],
  ["order_item", [["listing_defects", "listingDefects"], ["listing_photo_urls", "listingPhotoUrls"]]],
  ["ranking", [["byes_count", "byesCount"], ["gw_percentage", "gwPercentage"], ["is_provisional", "isProvisional"], ["ogw_percentage", "ogwPercentage"], ["omw_percentage", "omwPercentage"], ["tiebreak_explanation", "tiebreakExplanation"]]],
  ["seller_allocation", [["commission_amount", "commissionAmount"], ["commission_rate", "commissionRate"], ["created_at", "createdAt"], ["eligible_at", "eligibleAt"], ["gross_amount", "grossAmount"], ["net_amount", "netAmount"], ["refunded_amount", "refundedAmount"], ["shipping_amount", "shippingAmount"], ["updated_at", "updatedAt"]]],
  ["seller_payout", [["completed_at", "completedAt"], ["created_at", "createdAt"], ["failure_reason", "failureReason"], ["payout_destination_snapshot", "payoutDestinationSnapshot"], ["payout_method", "payoutMethod"], ["processed_at", "processedAt"], ["updated_at", "updatedAt"]]],
  ["seller_review", [["created_at", "createdAt"], ["updated_at", "updatedAt"], ["verified_purchase", "verifiedPurchase"]]],
  ["seller_settlement_account", [["balance_available", "balanceAvailable"], ["balance_on_hold", "balanceOnHold"], ["balance_paid_out", "balancePaidOut"], ["balance_pending", "balancePending"], ["created_at", "createdAt"], ["minimum_payout_amount", "minimumPayoutAmount"], ["payout_details", "payoutDetails"], ["payout_method", "payoutMethod"], ["updated_at", "updatedAt"]]],
  ["tournament", [["deck_submission_deadline", "deckSubmissionDeadline"], ["deck_visibility_policy", "deckVisibilityPolicy"], ["is_round_paused", "isRoundPaused"], ["paused_at", "pausedAt"], ["round_deadline", "roundDeadline"], ["round_duration_minutes", "roundDurationMinutes"], ["round_started_at", "roundStartedAt"]]],
  ["tournament_deck_snapshot", [["cards_snapshot", "cardsSnapshot"], ["deck_id", "deckId"], ["deck_name", "deckName"], ["format_id", "formatId"], ["is_locked", "isLocked"], ["is_valid", "isValid"], ["locked_at", "lockedAt"], ["player_id", "playerId"], ["rule_version", "ruleVersion"], ["submitted_at", "submittedAt"], ["tournament_id", "tournamentId"], ["user_id", "userId"], ["validation_errors", "validationErrors"]]],
  ];

  /** Renames misnamed columns and repairs the inventory availability backfill. */
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, columns] of RepairLegacyColumnNames1789500000000.RENAMES) {
      for (const [written, expected] of columns) {
        await queryRunner.query(
          `DO $$
            BEGIN
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                 WHERE table_schema = current_schema() AND table_name = '${table}' AND column_name = '${written}'
              ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                 WHERE table_schema = current_schema() AND table_name = '${table}' AND column_name = '${expected}'
              ) THEN
                ALTER TABLE "${table}" RENAME COLUMN "${written}" TO "${expected}";
              END IF;
            END $$`,
        );
      }
    }

    // The settlement migration wrote this default as a scaled literal, which
    // the driver reads back as a different value than the entity declares.
    await queryRunner.query(
      `ALTER TABLE "seller_allocation" ALTER COLUMN "commissionRate" SET DEFAULT 0.05`,
    );

    // The availability backfill added its column with DEFAULT 1, so its update
    // matched no row and every stack of more than one copy was left claiming a
    // single available copy. Only untouched stacks are repaired: a copy held by
    // a listing, sold, or already moved through the inventory ledger keeps the
    // quantities those operations produced.
    await queryRunner.query(`
      UPDATE "collection_item" c
         SET "quantityAvailable" = c."quantity"
       WHERE c."quantity" > 1
         AND c."quantityAvailable" = 1
         AND COALESCE(c."quantityReserved", 0) = 0
         AND COALESCE(c."quantitySold", 0) = 0
         AND NOT EXISTS (
           SELECT 1 FROM "inventory_movement" m
            WHERE m."collection_item_id" = c."id"
         )`);

    // The same migration stamped an unknown language on every existing copy.
    // A value nobody supplied is not evidence, so it is cleared where no other
    // physical attribute was ever recorded for that copy.
    await queryRunner.query(`
      UPDATE "collection_item"
         SET "language" = NULL
       WHERE "language" = 'fr'
         AND "variant" IS NULL
         AND "printing" IS NULL
         AND "acquiredAt" IS NULL
         AND "acquisitionCost" IS NULL
         AND "storageLocation" IS NULL
         AND "provenance" IS NULL`);
  }

  /**
   * Reverses nothing: the renamed columns are the ones the application reads,
   * and restoring a lost availability is not an error to undo.
   */
  async down(): Promise<void> {
    return;
  }
}
