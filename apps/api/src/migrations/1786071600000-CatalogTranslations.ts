import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Pokémon catalog translation tables migration.
 *
 * Additive migration: existing columns are preserved so legacy queries continue operating.
 * Existing catalog values are backfilled under locale 'fr' (original scraped language).
 */
export class CatalogTranslations1786071600000 implements MigrationInterface {
  name = "CatalogTranslations1786071600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Card search compares accent-insensitive labels (e.g. "pokemon" matches "Pokémon" across catalog languages).
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // `unaccent` is declared STABLE (depends on dictionary), unindexable directly.
    // This wrapper freezes dictionary context to IMMUTABLE, enabling expression index support.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION immutable_unaccent(text)
      RETURNS text
      LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS
      $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$
    `);

    // One card remains a single row regardless of language count:
    // prevents duplicate cards across backfills and preserves deck/collection/listing foreign keys.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_card_game_tcgDexId"
      ON "card" ("game", "tcgDexId")
      WHERE "tcgDexId" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "card_translation" (
        "card_id" uuid NOT NULL,
        "locale" character varying(10) NOT NULL,
        "name" character varying,
        "image" character varying,
        "category" character varying,
        "rarity" character varying,
        "description" text,
        "effect" text,
        "evolve_from" character varying,
        "stage" character varying,
        "suffix" character varying,
        "item" jsonb,
        "abilities" jsonb,
        "attacks" jsonb,
        "source_updated_at" character varying,
        CONSTRAINT "PK_card_translation" PRIMARY KEY ("card_id", "locale"),
        CONSTRAINT "FK_card_translation_card" FOREIGN KEY ("card_id")
          REFERENCES "card" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_card_translation_locale_name"
      ON "card_translation" ("locale", "name")
    `);

    // La recherche est un `ILIKE '%…%'` sur une expression : seul un index
    // trigram peut la servir. Sans lui, chaque recherche parcourt les 40 000
    // traductions.
    await queryRunner.query(`
      CREATE INDEX "IDX_card_translation_name_trgm"
      ON "card_translation"
      USING gin (immutable_unaccent("name") gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE TABLE "pokemon_set_translation" (
        "set_id" character varying NOT NULL,
        "locale" character varying(10) NOT NULL,
        "name" character varying,
        "logo" character varying,
        "symbol" character varying,
        CONSTRAINT "PK_pokemon_set_translation" PRIMARY KEY ("set_id", "locale"),
        CONSTRAINT "FK_pokemon_set_translation_set" FOREIGN KEY ("set_id")
          REFERENCES "pokemon_set" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pokemon_serie_translation" (
        "serie_id" character varying NOT NULL,
        "locale" character varying(10) NOT NULL,
        "name" character varying,
        "logo" character varying,
        CONSTRAINT "PK_pokemon_serie_translation" PRIMARY KEY ("serie_id", "locale"),
        CONSTRAINT "FK_pokemon_serie_translation_serie" FOREIGN KEY ("serie_id")
          REFERENCES "pokemon_serie" ("id") ON DELETE CASCADE
      )
    `);

    // Backfill existing data under locale 'fr'. Card linguistic fields are split across `card` and `pokemon_card_details`.
    await queryRunner.query(`
      INSERT INTO "card_translation" (
        "card_id", "locale", "name", "image", "category", "rarity",
        "description", "effect", "evolve_from", "stage", "suffix",
        "item", "abilities", "attacks", "source_updated_at"
      )
      SELECT
        c."id", 'fr', c."name", c."image", c."category", c."rarity",
        d."description", d."effect", d."evolveFrom", d."stage", d."suffix",
        d."item", d."abilities", d."attacks", c."updated"
      FROM "card" c
      LEFT JOIN "pokemon_card_details" d ON d."card_id" = c."id"
      ON CONFLICT ("card_id", "locale") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "pokemon_set_translation" ("set_id", "locale", "name", "logo", "symbol")
      SELECT "id", 'fr', "name", "logo", "symbol" FROM "pokemon_set"
      ON CONFLICT ("set_id", "locale") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "pokemon_serie_translation" ("serie_id", "locale", "name", "logo")
      SELECT "id", 'fr', "name", "logo" FROM "pokemon_serie"
      ON CONFLICT ("serie_id", "locale") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pokemon_serie_translation"`);
    await queryRunner.query(`DROP TABLE "pokemon_set_translation"`);
    await queryRunner.query(`DROP INDEX "IDX_card_translation_name_trgm"`);
    await queryRunner.query(`DROP INDEX "IDX_card_translation_locale_name"`);
    await queryRunner.query(`DROP TABLE "card_translation"`);
    await queryRunner.query(`DROP INDEX "UQ_card_game_tcgDexId"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS immutable_unaccent(text)`);
  }
}
