import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration 1786101000000:
 * - Enhances collection_item with physical variant, condition, acquisition records, location, and quantity availability tracking.
 * - Links marketplace listing to physical collection_item inventory.
 * - Adds completion policy and snapshot configuration to collection.
 */
export class CollectionInventoryAndListings1786101000000
  implements MigrationInterface
{
  name = "CollectionInventoryAndListings1786101000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enhance collection_item
    await queryRunner.query(`
      ALTER TABLE "collection_item"
        ADD COLUMN IF NOT EXISTS "variant" character varying(50),
        ADD COLUMN IF NOT EXISTS "language" character varying(10) DEFAULT 'fr',
        ADD COLUMN IF NOT EXISTS "printing" character varying(50),
        ADD COLUMN IF NOT EXISTS "acquired_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "acquisition_cost" numeric(10, 2),
        ADD COLUMN IF NOT EXISTS "acquisition_currency" character varying(10),
        ADD COLUMN IF NOT EXISTS "storage_location" character varying(255),
        ADD COLUMN IF NOT EXISTS "notes" text,
        ADD COLUMN IF NOT EXISTS "photo_urls" jsonb,
        ADD COLUMN IF NOT EXISTS "quantity_available" integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "quantity_reserved" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "quantity_sold" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "provenance" jsonb;
    `);

    // Backfill quantity_available to match quantity for existing items
    await queryRunner.query(`
      UPDATE "collection_item"
      SET "quantity_available" = "quantity",
          "quantity_reserved" = 0,
          "quantity_sold" = 0
      WHERE "quantity_available" IS NULL OR "quantity_available" = 0;
    `);

    // 2. Enhance listing with inventory linkage
    await queryRunner.query(`
      ALTER TABLE "listing"
        ADD COLUMN IF NOT EXISTS "inventory_item_id" integer,
        ADD COLUMN IF NOT EXISTS "is_inventory_backed" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_listing_inventory_item'
        ) THEN
          ALTER TABLE "listing"
            ADD CONSTRAINT "FK_listing_inventory_item"
            FOREIGN KEY ("inventory_item_id")
            REFERENCES "collection_item"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listing_inventory_item_id"
        ON "listing" ("inventory_item_id");
    `);

    // 3. Enhance collection with completion policy
    await queryRunner.query(`
      ALTER TABLE "collection"
        ADD COLUMN IF NOT EXISTS "completion_policy" character varying(50) NOT NULL DEFAULT 'base',
        ADD COLUMN IF NOT EXISTS "completion_snapshot" jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "collection"
        DROP COLUMN IF EXISTS "completion_snapshot",
        DROP COLUMN IF EXISTS "completion_policy";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_listing_inventory_item_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "listing"
        DROP CONSTRAINT IF EXISTS "FK_listing_inventory_item",
        DROP COLUMN IF EXISTS "is_inventory_backed",
        DROP COLUMN IF EXISTS "inventory_item_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "collection_item"
        DROP COLUMN IF EXISTS "provenance",
        DROP COLUMN IF EXISTS "quantity_sold",
        DROP COLUMN IF EXISTS "quantity_reserved",
        DROP COLUMN IF EXISTS "quantity_available",
        DROP COLUMN IF EXISTS "photo_urls",
        DROP COLUMN IF EXISTS "notes",
        DROP COLUMN IF EXISTS "storage_location",
        DROP COLUMN IF EXISTS "acquisition_currency",
        DROP COLUMN IF EXISTS "acquisition_cost",
        DROP COLUMN IF EXISTS "acquired_at",
        DROP COLUMN IF EXISTS "printing",
        DROP COLUMN IF EXISTS "language",
        DROP COLUMN IF EXISTS "variant";
    `);
  }
}
