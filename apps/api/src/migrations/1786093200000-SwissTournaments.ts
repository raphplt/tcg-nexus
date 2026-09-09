import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

/**
 * Columns required to orchestrate the Swiss system.
 *
 * - `match.isBye` replaces detecting a bye from its notes label: a bye counts
 *   as a win but must stay out of the tie-breakers.
 * - `tournament_registration.droppedAt/droppedRound` remove a player from the
 *   pairings without eliminating them in the bracket sense.
 *
 * Every statement is idempotent, so development databases where `synchronize`
 * already created the columns run through without error.
 */
export class SwissTournaments1786093200000 implements MigrationInterface {
  name = "SwissTournaments1786093200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'match' AND column_name = 'isBye'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE "match"
      ADD COLUMN IF NOT EXISTS "isBye" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "tournament_registration"
      ADD COLUMN IF NOT EXISTS "droppedAt" TIMESTAMP
    `);

    await queryRunner.query(`
      ALTER TABLE "tournament_registration"
      ADD COLUMN IF NOT EXISTS "droppedRound" integer
    `);

    // Backfill byes already stored, so far only recognisable by their note.
    await queryRunner.query(`
      UPDATE "match"
      SET "isBye" = true
      WHERE "notes" = 'Qualification automatique (bye)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tournament_registration" DROP COLUMN IF EXISTS "droppedRound"
    `);
    await queryRunner.query(`
      ALTER TABLE "tournament_registration" DROP COLUMN IF EXISTS "droppedAt"
    `);
    await queryRunner.query(`
      ALTER TABLE "match" DROP COLUMN IF EXISTS "isBye"
    `);
  }
}
