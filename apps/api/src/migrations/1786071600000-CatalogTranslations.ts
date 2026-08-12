import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Tables de traduction du catalogue Pokémon.
 *
 * Migration purement additive : aucune colonne existante n'est touchée, les
 * lectures actuelles continuent de fonctionner. Les valeurs déjà en base sont
 * recopiées en `fr`, langue dans laquelle elles ont été scrapées ; la suppression
 * des colonnes linguistiques de `card`, `pokemon_set` et `pokemon_serie` fera
 * l'objet d'une migration séparée, une fois toutes les lectures basculées.
 */
export class CatalogTranslations1786071600000 implements MigrationInterface {
  name = "CatalogTranslations1786071600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // La recherche de cartes compare des libellés accentués : « pokemon » doit
    // trouver « Pokémon », dans toutes les langues du catalogue.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);

    // Une carte reste une seule ligne quel que soit le nombre de langues :
    // c'est ce qui empêche un backfill de dupliquer les cartes et de casser
    // les decks, collections et annonces qui les référencent.
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

    // Reprise de l'existant en `fr`. Les champs linguistiques des cartes sont
    // répartis entre `card` et `pokemon_card_details`.
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
    await queryRunner.query(`DROP INDEX "IDX_card_translation_locale_name"`);
    await queryRunner.query(`DROP TABLE "card_translation"`);
    await queryRunner.query(`DROP INDEX "UQ_card_game_tcgDexId"`);
  }
}
