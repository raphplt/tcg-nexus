import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

/**
 * Adds durable bulk operation records for collection imports and edits (COL-04).
 *
 * Undo compensates the effects recorded here instead of deleting every item that
 * carries an operation identifier. Imports performed before this release keep
 * their provenance but have no recorded effects, so they are adopted as
 * already-undone operations rather than pretending they can be reversed.
 */
export class CollectionBulkOperations1789100000000
  implements MigrationInterface
{
  name = "CollectionBulkOperations1789100000000";

  /** Creates the operation tables and adopts legacy import provenance. */
  async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'collection_bulk_operation'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "collection_bulk_operation" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "collection_id" integer NOT NULL,
        "user_id" integer,
        "operationId" character varying(128) NOT NULL,
        "kind" character varying(32) NOT NULL,
        "mode" character varying(32),
        "status" character varying(16) NOT NULL DEFAULT 'applied',
        "summary" jsonb,
        "undoneAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_collection_bulk_operation_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_collection_bulk_operation_collection_operation" UNIQUE ("collection_id", "operationId"),
        CONSTRAINT "FK_collection_bulk_operation_collection" FOREIGN KEY ("collection_id")
          REFERENCES "collection"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_collection_bulk_operation_user" FOREIGN KEY ("user_id")
          REFERENCES "user"("id") ON DELETE SET NULL
      )`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_collection_bulk_operation_collection_created"
      ON "collection_bulk_operation" ("collection_id", "createdAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "collection_bulk_operation_line" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "operation_id" uuid NOT NULL,
        "collection_item_id" integer,
        "created" boolean NOT NULL DEFAULT false,
        "quantityDelta" integer NOT NULL DEFAULT 0,
        "availableDelta" integer NOT NULL DEFAULT 0,
        "previousQuantity" integer,
        "previousAvailable" integer,
        "previousCollectionId" character varying(64),
        "snapshot" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_collection_bulk_operation_line_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_collection_bulk_operation_line_operation" FOREIGN KEY ("operation_id")
          REFERENCES "collection_bulk_operation"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_collection_bulk_operation_line_item" FOREIGN KEY ("collection_item_id")
          REFERENCES "collection_item"("id") ON DELETE SET NULL
      )`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_collection_bulk_operation_line_operation"
      ON "collection_bulk_operation_line" ("operation_id")`);

    // Legacy imports are recorded as already undone: their per-row effects were
    // never captured, so no compensating adjustment can be derived from them.
    await queryRunner.query(`
      DO $$
      DECLARE
        collection_column text;
      BEGIN
        SELECT quote_ident(column_name) INTO collection_column
          FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = 'collection_item'
           AND column_name IN ('collectionId', 'collection_id') LIMIT 1;
        IF collection_column IS NULL THEN
          RAISE EXCEPTION 'collection_item collection column is missing';
        END IF;
        EXECUTE format(
          'INSERT INTO "collection_bulk_operation"
             ("collection_id", "operationId", "kind", "mode", "status", "summary", "undoneAt")
           SELECT DISTINCT ci.%1$s,
                  ci."provenance" ->> ''operationId'',
                  ''csv_import'',
                  ci."provenance" ->> ''mode'',
                  ''undone'',
                  jsonb_build_object(''adopted'', true),
                  now()
             FROM "collection_item" ci
            WHERE ci."provenance" ->> ''operationId'' IS NOT NULL
              AND ci."provenance" ->> ''source'' = ''csv_import''
           ON CONFLICT DO NOTHING',
          collection_column);
      END $$;`);
  }

  /** Removes only what this release added; collection items stay untouched. */
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_collection_bulk_operation_line_operation"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "collection_bulk_operation_line"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_collection_bulk_operation_collection_created"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "collection_bulk_operation"`);
  }
}
