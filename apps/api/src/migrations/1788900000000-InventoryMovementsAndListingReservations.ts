import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

/**
 * Adds the append-only inventory movement ledger and explicit listing
 * reservations (INT-02, MKT-02).
 *
 * Existing physical quantities are adopted as one opening movement per
 * collection item, and every inventory-backed listing records the copies it
 * currently holds, so later transitions can move an exact delta instead of
 * re-deriving one from the offer.
 */
export class InventoryMovementsAndListingReservations1788900000000
  implements MigrationInterface
{
  name = "InventoryMovementsAndListingReservations1788900000000";

  /** Extends existing installations; every added column is defaulted. */
  async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'inventory_movement'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`ALTER TABLE "listing"
      ADD COLUMN IF NOT EXISTS "inventoryReservedQuantity" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "reservationRevision" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "return_item"
      ADD COLUMN IF NOT EXISTS "dispositionRevision" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "restockedQuantity" integer NOT NULL DEFAULT 0`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_movement" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "collection_item_id" integer NOT NULL,
        "kind" character varying(40) NOT NULL,
        "deltaAvailable" integer NOT NULL DEFAULT 0,
        "deltaReserved" integer NOT NULL DEFAULT 0,
        "deltaSold" integer NOT NULL DEFAULT 0,
        "listing_id" integer,
        "order_item_id" integer,
        "return_item_id" uuid,
        "requestKey" character varying(160) NOT NULL,
        "reason" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_movement_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_inventory_movement_item_request_key" UNIQUE ("collection_item_id", "requestKey"),
        CONSTRAINT "FK_inventory_movement_collection_item" FOREIGN KEY ("collection_item_id")
          REFERENCES "collection_item"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inventory_movement_listing" FOREIGN KEY ("listing_id")
          REFERENCES "listing"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_inventory_movement_order_item" FOREIGN KEY ("order_item_id")
          REFERENCES "order_item"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_inventory_movement_return_item" FOREIGN KEY ("return_item_id")
          REFERENCES "return_item"("id") ON DELETE SET NULL
      )`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inventory_movement_item_created"
      ON "inventory_movement" ("collection_item_id", "createdAt")`);

    // Copies an inventory-backed listing holds: what it currently offers plus
    // what pending orders committed. Both are reserved on the collection item.
    await queryRunner.query(`
      UPDATE "listing" l
         SET "inventoryReservedQuantity" =
           (CASE WHEN l."status" = 'active' THEN GREATEST(l."quantityAvailable", 0) ELSE 0 END)
           + COALESCE((
               SELECT SUM(oi."quantity")
                 FROM "order_item" oi
                 JOIN "order" o ON o."id" = oi."order_id"
                WHERE oi."listing_id" = l."id" AND o."status" = 'Pending'
             ), 0)
       WHERE l."isInventoryBacked" = true`);

    // Adoption entry: without it the ledger could not explain the quantities a
    // collection item already carries, and reconciliation would report every
    // pre-existing item as inconsistent.
    await queryRunner.query(`
      INSERT INTO "inventory_movement"
        ("collection_item_id", "kind", "deltaAvailable", "deltaReserved", "deltaSold", "requestKey", "reason")
      SELECT c."id", 'opening_balance',
             COALESCE(c."quantityAvailable", 0),
             COALESCE(c."quantityReserved", 0),
             COALESCE(c."quantitySold", 0),
             'item:' || c."id" || ':opening',
             'Quantities recorded before the inventory ledger existed'
        FROM "collection_item" c
       WHERE COALESCE(c."quantityAvailable", 0) <> 0
          OR COALESCE(c."quantityReserved", 0) <> 0
          OR COALESCE(c."quantitySold", 0) <> 0
      ON CONFLICT DO NOTHING`);
  }

  /** Removes only what this release added; physical quantities stay untouched. */
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_inventory_movement_item_created"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_movement"`);
    await queryRunner.query(`ALTER TABLE "return_item"
      DROP COLUMN IF EXISTS "restockedQuantity",
      DROP COLUMN IF EXISTS "dispositionRevision"`);
    await queryRunner.query(`ALTER TABLE "listing"
      DROP COLUMN IF EXISTS "reservationRevision",
      DROP COLUMN IF EXISTS "inventoryReservedQuantity"`);
  }
}
