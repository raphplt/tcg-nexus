import { MigrationInterface, QueryRunner } from "typeorm";

export class UserPreferredLocale1786064400000 implements MigrationInterface {
  name = "UserPreferredLocale1786064400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
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
