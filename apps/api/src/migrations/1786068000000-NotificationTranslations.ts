import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

export class NotificationTranslations1786068000000
  implements MigrationInterface
{
  name = "NotificationTranslations1786068000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'notification' AND column_name = 'translationKey'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE "notification"
      ADD COLUMN "translationKey" character varying,
      ADD COLUMN "translationParams" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification"
      DROP COLUMN "translationParams",
      DROP COLUMN "translationKey"
    `);
  }
}
