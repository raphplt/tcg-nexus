import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Drops the catalog's localized columns.
 *
 * They duplicated the translation tables introduced by `CatalogTranslations`:
 * no locale is privileged, so a card should not carry a name, nor a set a logo.
 *
 * `illustrator` stays on `card`: it is a proper noun and is not translated.
 * Game data — hp, types, weaknesses, retreat cost, normalized category — is
 * likewise not localized.
 *
 * Destructive migration: `down` recreates the columns and refills them from
 * the default locale, but a value edited by hand on one side only would be lost.
 */
export class DropLegacyCatalogColumns1786075200000
  implements MigrationInterface
{
  name = "DropLegacyCatalogColumns1786075200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "card"
        DROP COLUMN IF EXISTS "name",
        DROP COLUMN IF EXISTS "image",
        DROP COLUMN IF EXISTS "category",
        DROP COLUMN IF EXISTS "rarity"
    `);

    await queryRunner.query(`
      ALTER TABLE "pokemon_card_details"
        DROP COLUMN IF EXISTS "description",
        DROP COLUMN IF EXISTS "effect",
        DROP COLUMN IF EXISTS "evolveFrom",
        DROP COLUMN IF EXISTS "stage",
        DROP COLUMN IF EXISTS "suffix",
        DROP COLUMN IF EXISTS "item",
        DROP COLUMN IF EXISTS "abilities",
        DROP COLUMN IF EXISTS "attacks"
    `);

    await queryRunner.query(`
      ALTER TABLE "pokemon_set"
        DROP COLUMN IF EXISTS "name",
        DROP COLUMN IF EXISTS "logo",
        DROP COLUMN IF EXISTS "symbol"
    `);

    await queryRunner.query(`
      ALTER TABLE "pokemon_serie"
        DROP COLUMN IF EXISTS "name",
        DROP COLUMN IF EXISTS "logo"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "card"
        ADD COLUMN "name" character varying,
        ADD COLUMN "image" character varying,
        ADD COLUMN "category" character varying,
        ADD COLUMN "rarity" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "pokemon_card_details"
        ADD COLUMN "description" character varying,
        ADD COLUMN "effect" text,
        ADD COLUMN "evolveFrom" character varying,
        ADD COLUMN "stage" character varying,
        ADD COLUMN "suffix" character varying,
        ADD COLUMN "item" jsonb,
        ADD COLUMN "abilities" jsonb,
        ADD COLUMN "attacks" jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "pokemon_set"
        ADD COLUMN "name" character varying,
        ADD COLUMN "logo" character varying,
        ADD COLUMN "symbol" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "pokemon_serie"
        ADD COLUMN "name" character varying,
        ADD COLUMN "logo" character varying
    `);

    // Repopulate legacy columns from default locale translations
    await queryRunner.query(`
      UPDATE "card" c SET
        "name" = t."name", "image" = t."image",
        "category" = t."category", "rarity" = t."rarity"
      FROM "card_translation" t
      WHERE t."card_id" = c."id" AND t."locale" = 'fr'
    `);
    await queryRunner.query(`
      UPDATE "pokemon_card_details" d SET
        "description" = t."description", "effect" = t."effect",
        "evolveFrom" = t."evolve_from", "stage" = t."stage",
        "suffix" = t."suffix", "item" = t."item",
        "abilities" = t."abilities", "attacks" = t."attacks"
      FROM "card_translation" t
      WHERE t."card_id" = d."card_id" AND t."locale" = 'fr'
    `);
    await queryRunner.query(`
      UPDATE "pokemon_set" s SET
        "name" = t."name", "logo" = t."logo", "symbol" = t."symbol"
      FROM "pokemon_set_translation" t
      WHERE t."set_id" = s."id" AND t."locale" = 'fr'
    `);
    await queryRunner.query(`
      UPDATE "pokemon_serie" s SET "name" = t."name", "logo" = t."logo"
      FROM "pokemon_serie_translation" t
      WHERE t."serie_id" = s."id" AND t."locale" = 'fr'
    `);
  }
}
