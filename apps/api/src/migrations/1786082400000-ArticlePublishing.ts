import { MigrationInterface, QueryRunner } from "typeorm";

/** Adds the publishing workflow and editorial metadata to articles. */
export class ArticlePublishing1786082400000 implements MigrationInterface {
  name = "ArticlePublishing1786082400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "article_status_enum" AS ENUM ('draft', 'published')
    `);
    await queryRunner.query(`
      ALTER TABLE "article"
      ADD COLUMN "slug" character varying(180),
      ADD COLUMN "excerpt" text,
      ADD COLUMN "status" "article_status_enum" NOT NULL DEFAULT 'draft',
      ADD COLUMN "locale" character varying(10) NOT NULL DEFAULT 'fr',
      ADD COLUMN "metaTitle" character varying,
      ADD COLUMN "metaDescription" text,
      ADD COLUMN "authorId" integer
    `);
    await queryRunner.query(`
      UPDATE "article"
      SET
        "slug" = 'article-' || "id",
        "status" = CASE
          WHEN "publishedAt" IS NOT NULL AND "publishedAt" <= NOW()
            THEN 'published'::"article_status_enum"
          ELSE 'draft'::"article_status_enum"
        END
    `);
    await queryRunner.query(`
      ALTER TABLE "article" ALTER COLUMN "slug" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "article"
      ADD CONSTRAINT "UQ_article_slug" UNIQUE ("slug"),
      ADD CONSTRAINT "FK_article_author" FOREIGN KEY ("authorId")
      REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_article_publication"
      ON "article" ("locale", "status", "publishedAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_article_publication"`);
    await queryRunner.query(`
      ALTER TABLE "article"
      DROP CONSTRAINT "FK_article_author",
      DROP CONSTRAINT "UQ_article_slug"
    `);
    await queryRunner.query(`
      ALTER TABLE "article"
      DROP COLUMN "authorId",
      DROP COLUMN "metaDescription",
      DROP COLUMN "metaTitle",
      DROP COLUMN "locale",
      DROP COLUMN "status",
      DROP COLUMN "excerpt",
      DROP COLUMN "slug"
    `);
    await queryRunner.query(`DROP TYPE "article_status_enum"`);
  }
}
