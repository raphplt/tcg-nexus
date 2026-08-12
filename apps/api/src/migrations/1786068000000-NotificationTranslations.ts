import { MigrationInterface, QueryRunner } from "typeorm";

export class NotificationTranslations1786068000000
  implements MigrationInterface
{
  name = "NotificationTranslations1786068000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
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
