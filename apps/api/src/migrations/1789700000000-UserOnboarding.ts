import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

/** Adds versioned product-onboarding state while exempting existing accounts. */
export class UserOnboarding1789700000000 implements MigrationInterface {
  name = "UserOnboarding1789700000000";

  /**
   * Adds and backfills the onboarding columns.
   *
   * @param queryRunner Active migration query runner.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'user' AND column_name = 'onboardingVersion'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "onboardingVersion" integer,
      ADD COLUMN IF NOT EXISTS "onboardingStatus" character varying(16),
      ADD COLUMN IF NOT EXISTS "onboardingUpdatedAt" TIMESTAMP
    `);
    await queryRunner.query(`
      UPDATE "user"
      SET "onboardingVersion" = 1,
          "onboardingStatus" = 'completed',
          "onboardingUpdatedAt" = NOW()
      WHERE "onboardingVersion" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "user"
      ALTER COLUMN "onboardingVersion" SET DEFAULT 0,
      ALTER COLUMN "onboardingVersion" SET NOT NULL,
      ALTER COLUMN "onboardingStatus" SET DEFAULT 'pending',
      ALTER COLUMN "onboardingStatus" SET NOT NULL
    `);
  }

  /**
   * Removes the onboarding columns.
   *
   * @param queryRunner Active migration query runner.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN IF EXISTS "onboardingUpdatedAt",
      DROP COLUMN IF EXISTS "onboardingStatus",
      DROP COLUMN IF EXISTS "onboardingVersion"
    `);
  }
}

