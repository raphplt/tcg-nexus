import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds durable receipt identity for delivered order lines (INT-03).
 *
 * Existing collection items carrying marketplace provenance are adopted as
 * receipts, so the cumulative received quantity of a line includes what was
 * already imported and no purchase can be received twice after this release.
 */
export class ReceiptImports1789000000000 implements MigrationInterface {
  name = "ReceiptImports1789000000000";

  /** Extends existing installations; the added column is nullable. */
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_item"
      ADD COLUMN IF NOT EXISTS "receiptConfirmedAt" TIMESTAMP`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "receipt_import" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_item_id" integer NOT NULL,
        "buyer_id" integer NOT NULL,
        "collection_id" integer,
        "collection_item_id" integer,
        "quantity" integer NOT NULL DEFAULT 1,
        "requestKey" character varying(160) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_receipt_import_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_receipt_import_line_request_key" UNIQUE ("order_item_id", "requestKey"),
        CONSTRAINT "FK_receipt_import_order_item" FOREIGN KEY ("order_item_id")
          REFERENCES "order_item"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_receipt_import_buyer" FOREIGN KEY ("buyer_id")
          REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_receipt_import_collection" FOREIGN KEY ("collection_id")
          REFERENCES "collection"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_receipt_import_collection_item" FOREIGN KEY ("collection_item_id")
          REFERENCES "collection_item"("id") ON DELETE SET NULL
      )`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_receipt_import_order_item"
      ON "receipt_import" ("order_item_id")`);

    // Lines already confirmed as delivered keep their existing date; the
    // declaration cannot be told apart from the confirmation retroactively.
    await queryRunner.query(`
      UPDATE "order_item"
         SET "receiptConfirmedAt" = "deliveredAt"
       WHERE "deliveredAt" IS NOT NULL AND "receiptConfirmedAt" IS NULL`);

    // Adoption: collection items imported before this release become receipts,
    // capped at the purchased quantity of their line. The collection reference
    // differs in naming between synchronized and migrated schemas.
    await queryRunner.query(`
      DO $$
      DECLARE
        collection_column text;
      BEGIN
        SELECT quote_ident(column_name) INTO collection_column
          FROM information_schema.columns
         WHERE table_name = 'collection_item'
           AND column_name IN ('collectionId', 'collection_id') LIMIT 1;
        IF collection_column IS NULL THEN
          RAISE EXCEPTION 'collection_item collection column is missing';
        END IF;
        EXECUTE format(
          'INSERT INTO "receipt_import"
             ("order_item_id", "buyer_id", "collection_id", "collection_item_id", "quantity", "requestKey")
           SELECT oi."id", o."buyer_id", ci.%1$s, ci."id",
                  LEAST(GREATEST(COALESCE(ci."quantity", 1), 1), oi."quantity"),
                  ''legacy:'' || ci."id"
             FROM "collection_item" ci
             JOIN "order_item" oi
               ON oi."id" = (ci."provenance" ->> ''orderItemId'')::integer
             JOIN "order" o ON o."id" = oi."order_id"
            WHERE ci."provenance" ->> ''orderItemId'' IS NOT NULL
           ON CONFLICT DO NOTHING',
          collection_column);
      END $$;`);
  }

  /** Removes only what this release added; imported collection items stay. */
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_receipt_import_order_item"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "receipt_import"`);
    await queryRunner.query(`ALTER TABLE "order_item"
      DROP COLUMN IF EXISTS "receiptConfirmedAt"`);
  }
}
