import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Supprime les colonnes linguistiques du catalogue.
 *
 * Elles faisaient double emploi avec les tables de traduction depuis la
 * migration `CatalogTranslations` : le modèle ne privilégie aucune langue, une
 * carte n'a donc pas à porter un nom, et un set pas à porter un logo.
 *
 * `illustrator` reste sur `card` : c'est un nom propre, il ne se traduit pas.
 * Les données de jeu — hp, types, faiblesses, coût de retraite, catégorie
 * normalisée — restent elles aussi non linguistiques.
 *
 * Migration destructive : le `down` recrée les colonnes et y recopie la langue
 * par défaut, mais une valeur corrigée à la main d'un seul côté serait perdue.
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
