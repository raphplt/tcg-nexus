import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Persists the bracket structure instead of recomputing it from the match ids.
 *
 * Double elimination cannot infer where a player goes next: a loser's
 * destination depends on their exact position in the tree. The links are
 * therefore stored on the match itself, and single elimination now uses the
 * same mechanism.
 *
 * Every statement is idempotent so development databases where `synchronize`
 * already created the columns run through without error.
 */
export class DoubleElimination1786096800000 implements MigrationInterface {
  name = "DoubleElimination1786096800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_bracketside_enum') THEN
          CREATE TYPE "match_bracketside_enum" AS ENUM ('winners', 'losers', 'grand_final');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "match"
      ADD COLUMN IF NOT EXISTS "bracketSide" "match_bracketside_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "match" ADD COLUMN IF NOT EXISTS "bracketPosition" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "match" ADD COLUMN IF NOT EXISTS "nextMatchId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "match" ADD COLUMN IF NOT EXISTS "nextSlot" character varying(1)
    `);

    await queryRunner.query(`
      ALTER TABLE "match" ADD COLUMN IF NOT EXISTS "loserNextMatchId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "match" ADD COLUMN IF NOT EXISTS "loserNextSlot" character varying(1)
    `);

    await queryRunner.query(`
      ALTER TABLE "tournament"
      ADD COLUMN IF NOT EXISTS "grandFinalReset" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tournament" DROP COLUMN IF EXISTS "grandFinalReset"
    `);
    await queryRunner.query(`
      ALTER TABLE "match" DROP COLUMN IF EXISTS "loserNextSlot"
    `);
    await queryRunner.query(`
      ALTER TABLE "match" DROP COLUMN IF EXISTS "loserNextMatchId"
    `);
    await queryRunner.query(`
      ALTER TABLE "match" DROP COLUMN IF EXISTS "nextSlot"
    `);
    await queryRunner.query(`
      ALTER TABLE "match" DROP COLUMN IF EXISTS "nextMatchId"
    `);
    await queryRunner.query(`
      ALTER TABLE "match" DROP COLUMN IF EXISTS "bracketPosition"
    `);
    await queryRunner.query(`
      ALTER TABLE "match" DROP COLUMN IF EXISTS "bracketSide"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "match_bracketside_enum"`);
  }
}
