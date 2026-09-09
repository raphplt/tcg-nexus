import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

export class UserPreferredLocale1786064400000 implements MigrationInterface {
  name = "UserPreferredLocale1786064400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'user' AND column_name ILIKE '%referredlocale%'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN "preferredLocale" character varying(10) NOT NULL DEFAULT 'fr'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN "preferredLocale"
    `);
  }
}
