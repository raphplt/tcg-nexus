import { MigrationInterface, QueryRunner } from "typeorm";

/** Adds versioned product-onboarding state while exempting existing accounts. */
export class UserOnboarding1789700000000 implements MigrationInterface {
  name = "UserOnboarding1789700000000";

  /**
   * Adds and backfills the onboarding columns.
   *
   * @param queryRunner Active migration query runner.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN "onboardingVersion" integer,
      ADD COLUMN "onboardingStatus" character varying(16),
      ADD COLUMN "onboardingUpdatedAt" TIMESTAMP
    `);
    await queryRunner.query(`
      UPDATE "user"
      SET "onboardingVersion" = 1,
          "onboardingStatus" = 'completed',
          "onboardingUpdatedAt" = NOW()
    `);
    await queryRunner.query(`
      ALTER TABLE "user"
      ALTER COLUMN "onboardingVersion" SET DEFAULT 0,
      ALTER COLUMN "onboardingVersion" SET NOT NULL,
      ALTER COLUMN "onboardingStatus" SET DEFAULT 'pending',
      ALTER COLUMN "onboardingStatus" SET NOT NULL,
      ADD CONSTRAINT "CHK_user_onboarding_status"
        CHECK ("onboardingStatus" IN ('pending', 'completed', 'skipped'))
    `);
  }

  /**
   * Removes the onboarding columns and their validation constraint.
   *
   * @param queryRunner Active migration query runner.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" DROP CONSTRAINT "CHK_user_onboarding_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN "onboardingUpdatedAt",
      DROP COLUMN "onboardingStatus",
      DROP COLUMN "onboardingVersion"
    `);
  }
}
