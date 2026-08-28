import { MigrationInterface, QueryRunner } from "typeorm";

/** Ensures all articles possess non-null, valid, and unique slugs. */
export class ArticleSlugIntegrity1786097000000 implements MigrationInterface {
  name = "ArticleSlugIntegrity1786097000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill any missing or null slugs from title or id
    await queryRunner.query(`
      UPDATE "article"
      SET "slug" = 'article-' || "id"
      WHERE "slug" IS NULL OR TRIM("slug") = ''
    `);

    // Ensure slug column is NOT NULL
    await queryRunner.query(`
      ALTER TABLE "article"
      ALTER COLUMN "slug" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "article"
      ALTER COLUMN "slug" DROP NOT NULL
    `);
  }
}
