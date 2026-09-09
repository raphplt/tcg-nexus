import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

/**
 * Migration 1786102000000:
 * - Introduces match_result_proposal table for player score submissions, opponent confirmation, and disputes (TRN-01).
 * - Introduces tournament_deck_snapshot table for immutable deck snapshots, format validation, and locking (TRN-02).
 * - Adds table_number, result_status, disputed_at, confirmed_at to match table.
 * - Adds round clock and deck policy columns to tournament table (TRN-03, TRN-05).
 * - Adds official tiebreaker columns (omw, gw, ogw, byes, explanation) to ranking table (TRN-04).
 */
export class TournamentOperations1786102000000 implements MigrationInterface {
  name = "TournamentOperations1786102000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_deck_snapshot'`,
      )
    ) {
      return;
    }

    // 1. Create match_result_proposal table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "match_result_proposal" (
        "id" SERIAL PRIMARY KEY,
        "match_id" integer NOT NULL,
        "proposer_player_id" integer NOT NULL,
        "proposer_user_id" integer,
        "player_a_score" integer NOT NULL DEFAULT 0,
        "player_b_score" integer NOT NULL DEFAULT 0,
        "status" character varying(50) NOT NULL DEFAULT 'pending_confirmation',
        "opponent_response" character varying(50) NOT NULL DEFAULT 'pending',
        "dispute_reason" text,
        "organizer_resolution_reason" text,
        "resolved_by_user_id" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_match_result_proposal_match" FOREIGN KEY ("match_id") REFERENCES "match"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_match_result_proposal_player" FOREIGN KEY ("proposer_player_id") REFERENCES "player"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_match_result_proposal_user" FOREIGN KEY ("proposer_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_match_result_proposal_resolver" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_match_result_proposal_match_status"
      ON "match_result_proposal" ("match_id", "status");
    `);

    // 2. Create tournament_deck_snapshot table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tournament_deck_snapshot" (
        "id" SERIAL PRIMARY KEY,
        "tournament_id" integer NOT NULL,
        "player_id" integer NOT NULL,
        "user_id" integer,
        "deck_id" integer,
        "deck_name" character varying(255) NOT NULL,
        "format_id" integer,
        "rule_version" character varying(50) DEFAULT 'STANDARD_2026',
        "cards_snapshot" jsonb NOT NULL,
        "is_locked" boolean NOT NULL DEFAULT false,
        "is_valid" boolean NOT NULL DEFAULT true,
        "validation_errors" jsonb,
        "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "locked_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_tournament_deck_snapshot_player" UNIQUE ("tournament_id", "player_id"),
        CONSTRAINT "FK_tournament_deck_snapshot_tournament" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tournament_deck_snapshot_player" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tournament_deck_snapshot_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_tournament_deck_snapshot_deck" FOREIGN KEY ("deck_id") REFERENCES "deck"("id") ON DELETE SET NULL
      );
    `);

    // 3. Enhance match table
    await queryRunner.query(`
      ALTER TABLE "match"
        ADD COLUMN IF NOT EXISTS "result_status" character varying(50) NOT NULL DEFAULT 'unreported',
        ADD COLUMN IF NOT EXISTS "table_number" integer,
        ADD COLUMN IF NOT EXISTS "disputed_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP WITH TIME ZONE;
    `);

    // 4. Enhance tournament table
    await queryRunner.query(`
      ALTER TABLE "tournament"
        ADD COLUMN IF NOT EXISTS "round_started_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "round_duration_minutes" integer NOT NULL DEFAULT 50,
        ADD COLUMN IF NOT EXISTS "round_deadline" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "is_round_paused" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "deck_submission_deadline" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "deck_visibility_policy" character varying(50) NOT NULL DEFAULT 'public_on_start';
    `);

    // 5. Enhance ranking table with tiebreaker metrics
    await queryRunner.query(`
      ALTER TABLE "ranking"
        ADD COLUMN IF NOT EXISTS "omw_percentage" numeric(6, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "gw_percentage" numeric(6, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "ogw_percentage" numeric(6, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "byes_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "is_provisional" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "tiebreak_explanation" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ranking"
        DROP COLUMN IF EXISTS "tiebreak_explanation",
        DROP COLUMN IF EXISTS "is_provisional",
        DROP COLUMN IF EXISTS "byes_count",
        DROP COLUMN IF EXISTS "ogw_percentage",
        DROP COLUMN IF EXISTS "gw_percentage",
        DROP COLUMN IF EXISTS "omw_percentage";
    `);

    await queryRunner.query(`
      ALTER TABLE "tournament"
        DROP COLUMN IF EXISTS "deck_visibility_policy",
        DROP COLUMN IF EXISTS "deck_submission_deadline",
        DROP COLUMN IF EXISTS "paused_at",
        DROP COLUMN IF EXISTS "is_round_paused",
        DROP COLUMN IF EXISTS "round_deadline",
        DROP COLUMN IF EXISTS "round_duration_minutes",
        DROP COLUMN IF EXISTS "round_started_at";
    `);

    await queryRunner.query(`
      ALTER TABLE "match"
        DROP COLUMN IF EXISTS "confirmed_at",
        DROP COLUMN IF EXISTS "disputed_at",
        DROP COLUMN IF EXISTS "table_number",
        DROP COLUMN IF EXISTS "result_status";
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "tournament_deck_snapshot";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "match_result_proposal";`);
  }
}
