import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Repairs order snapshots taken after catalog labels moved to translation
 * tables: checkout read `name`/`image` straight off unresolved entities and
 * persisted "Produit inconnu" with no image nor set name.
 */
export class BackfillOrderItemProductLabels1789800000000
  implements MigrationInterface
{
  name = "BackfillOrderItemProductLabels1789800000000";

  /**
   * Rebuilds broken labels from the listing's catalog translations, preferring
   * the default locale, then any other one.
   *
   * @param queryRunner Active migration query runner.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "order_item" oi
      SET "productName" = COALESCE(
            (SELECT t."name" FROM "card_translation" t
             WHERE t."card_id" = l."card_id" AND t."name" IS NOT NULL
             ORDER BY (t."locale" = 'fr') DESC, t."locale" LIMIT 1),
            oi."productName"),
          "productImage" = COALESCE(oi."productImage",
            (SELECT t."image" FROM "card_translation" t
             WHERE t."card_id" = l."card_id" AND t."image" IS NOT NULL
             ORDER BY (t."locale" = 'fr') DESC, t."locale" LIMIT 1)),
          "productSetName" = COALESCE(oi."productSetName",
            (SELECT st."name" FROM "card" c
             JOIN "pokemon_set_translation" st ON st."set_id" = c."setId"
             WHERE c."id" = l."card_id" AND st."name" IS NOT NULL
             ORDER BY (st."locale" = 'fr') DESC, st."locale" LIMIT 1))
      FROM "listing" l
      WHERE l."id" = oi."listing_id"
        AND l."card_id" IS NOT NULL
        AND oi."productName" IN ('Produit inconnu', '')
    `);

    await queryRunner.query(`
      UPDATE "order_item" oi
      SET "productName" = COALESCE(
            (SELECT loc."name" FROM "sealed_product_locale" loc
             WHERE loc."sealed_product_id" = l."sealed_product_id"
             ORDER BY (loc."locale" = 'fr') DESC, loc."locale" LIMIT 1),
            oi."productName"),
          "productSetName" = COALESCE(oi."productSetName",
            (SELECT st."name" FROM "sealed_product" sp
             JOIN "pokemon_set_translation" st ON st."set_id" = sp."pokemon_set_id"
             WHERE sp."id" = l."sealed_product_id" AND st."name" IS NOT NULL
             ORDER BY (st."locale" = 'fr') DESC, st."locale" LIMIT 1))
      FROM "listing" l
      WHERE l."id" = oi."listing_id"
        AND l."sealed_product_id" IS NOT NULL
        AND oi."productName" IN ('Produit inconnu', '')
    `);
  }

  /** Data repair: the broken labels are not worth restoring. */
  public async down(): Promise<void> {}
}
