import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

/**
 * Adds explicit deck legality, submission history and rating reversal (TRN-02, TRN-05).
 *
 * Lists submitted before this release were only checked for their card count,
 * so they are adopted as `unverified` rather than being presented as legal.
 */
export class DeckLegalityAndCorrections1789400000000
  implements MigrationInterface
{
  name = "DeckLegalityAndCorrections1789400000000";

  /** Extends existing installations; every added column is nullable or defaulted. */
  async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'tournament_deck_snapshot_revision'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`ALTER TABLE "tournament_deck_snapshot"
      ADD COLUMN IF NOT EXISTS "legalityStatus" character varying(16) NOT NULL DEFAULT 'unverified',
      ADD COLUMN IF NOT EXISTS "revision" integer NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "overriddenByUserId" integer,
      ADD COLUMN IF NOT EXISTS "overrideReason" text,
      ADD COLUMN IF NOT EXISTS "overriddenAt" TIMESTAMP WITH TIME ZONE`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tournament_deck_snapshot_revision" (
        "id" SERIAL PRIMARY KEY,
        "snapshot_id" integer NOT NULL,
        "revision" integer NOT NULL,
        "submitted_by_user_id" integer,
        "cardsSnapshot" jsonb NOT NULL,
        "legalityStatus" character varying(16) NOT NULL,
        "validationErrors" jsonb,
        "ruleVersion" character varying(50) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_deck_snapshot_revision_snapshot_revision" UNIQUE ("snapshot_id", "revision"),
        CONSTRAINT "FK_deck_snapshot_revision_snapshot" FOREIGN KEY ("snapshot_id")
          REFERENCES "tournament_deck_snapshot"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_deck_snapshot_revision_user" FOREIGN KEY ("submitted_by_user_id")
          REFERENCES "user"("id") ON DELETE SET NULL
      )`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_deck_snapshot_revision_snapshot"
      ON "tournament_deck_snapshot_revision" ("snapshot_id")`);

    await queryRunner.query(`ALTER TABLE "ranked_match_history"
      ADD COLUMN IF NOT EXISTS "reversedAt" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "reversalReason" text`);

    // A list validated only on its card count was never checked against the
    // catalog, so it is adopted as unverified instead of legal.
    await queryRunner.query(`
      UPDATE "tournament_deck_snapshot"
         SET "legalityStatus" = CASE WHEN "isValid" THEN 'unverified' ELSE 'invalid' END`);

    // Each existing list becomes the first entry of its own history.
    await queryRunner.query(`
      INSERT INTO "tournament_deck_snapshot_revision"
        ("snapshot_id", "revision", "cardsSnapshot", "legalityStatus", "validationErrors", "ruleVersion")
      SELECT s."id", 1, s."cardsSnapshot", s."legalityStatus",
             s."validationErrors", s."ruleVersion"
        FROM "tournament_deck_snapshot" s
      ON CONFLICT DO NOTHING`);
  }

  /** Removes only what this release added; submitted lists stay untouched. */
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ranked_match_history"
      DROP COLUMN IF EXISTS "reversalReason",
      DROP COLUMN IF EXISTS "reversedAt"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_deck_snapshot_revision_snapshot"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "tournament_deck_snapshot_revision"`,
    );
    await queryRunner.query(`ALTER TABLE "tournament_deck_snapshot"
      DROP COLUMN IF EXISTS "overriddenAt",
      DROP COLUMN IF EXISTS "overrideReason",
      DROP COLUMN IF EXISTS "overriddenByUserId",
      DROP COLUMN IF EXISTS "revision",
      DROP COLUMN IF EXISTS "legalityStatus"`);
  }
}
