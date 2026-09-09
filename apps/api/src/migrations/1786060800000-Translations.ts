import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

export class Translations1786060800000 implements MigrationInterface {
  name = "Translations1786060800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name ILIKE '%translation%'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`
      CREATE TABLE "translation" (
        "id" SERIAL NOT NULL,
        "locale" character varying(10) NOT NULL,
        "key" character varying(255) NOT NULL,
        "value" text NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_translation" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_translation_locale_key"
      ON "translation" ("locale", "key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_translation_locale_key"`);
    await queryRunner.query(`DROP TABLE "translation"`);
  }
}
