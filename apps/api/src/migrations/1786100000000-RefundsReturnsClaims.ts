import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

/**
 * Creates refund_operation, refund_line, return_item tables and adds claim/order linkages to support_ticket.
 */
export class RefundsReturnsClaims1786100000000 implements MigrationInterface {
  name = "RefundsReturnsClaims1786100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'refund_operation'`,
      )
    ) {
      return;
    }

    // 1. Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "refund_status_enum" AS ENUM ('pending', 'succeeded', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "return_status_enum" AS ENUM ('requested', 'approved', 'in_transit', 'received', 'rejected');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "inventory_disposition_enum" AS ENUM ('restock', 'damaged', 'discarded', 'no_return_required');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "claim_category_enum" AS ENUM ('damaged_item', 'missing_item', 'wrong_item', 'non_delivery', 'general');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // 2. Refund Operation table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refund_operation" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" integer NOT NULL,
        "amount" numeric(10, 2) NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'EUR',
        "reason" text,
        "status" "refund_status_enum" NOT NULL DEFAULT 'pending',
        "providerRefundId" character varying(128),
        "created_by_id" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refund_operation_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refund_operation_order" FOREIGN KEY ("order_id")
          REFERENCES "order"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_refund_operation_created_by" FOREIGN KEY ("created_by_id")
          REFERENCES "user"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refund_operation_order_id"
        ON "refund_operation" ("order_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refund_operation_providerRefundId"
        ON "refund_operation" ("providerRefundId");
    `);

    // 3. Refund Line table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refund_line" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "refund_operation_id" uuid NOT NULL,
        "order_item_id" integer NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "amount" numeric(10, 2) NOT NULL,
        "shippingAmount" numeric(10, 2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_refund_line_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refund_line_operation" FOREIGN KEY ("refund_operation_id")
          REFERENCES "refund_operation"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_refund_line_order_item" FOREIGN KEY ("order_item_id")
          REFERENCES "order_item"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refund_line_operation_id"
        ON "refund_line" ("refund_operation_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refund_line_order_item_id"
        ON "refund_line" ("order_item_id");
    `);

    // 4. Return Item table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "return_item" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_item_id" integer NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "reason" text NOT NULL,
        "status" "return_status_enum" NOT NULL DEFAULT 'requested',
        "disposition" "inventory_disposition_enum" NOT NULL DEFAULT 'no_return_required',
        "receivedAt" TIMESTAMP,
        "disposedAt" TIMESTAMP,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_return_item_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_return_item_order_item" FOREIGN KEY ("order_item_id")
          REFERENCES "order_item"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_return_item_order_item_id"
        ON "return_item" ("order_item_id");
    `);

    // 5. Link Support Ticket to Order, Order Item, and Claim Category
    await queryRunner.query(`
      ALTER TABLE "support_ticket"
        ADD COLUMN IF NOT EXISTS "order_id" integer,
        ADD COLUMN IF NOT EXISTS "order_item_id" integer,
        ADD COLUMN IF NOT EXISTS "claimCategory" "claim_category_enum";
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "support_ticket"
          ADD CONSTRAINT "FK_support_ticket_order" FOREIGN KEY ("order_id")
          REFERENCES "order"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "support_ticket"
          ADD CONSTRAINT "FK_support_ticket_order_item" FOREIGN KEY ("order_item_id")
          REFERENCES "order_item"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_support_ticket_order_id"
        ON "support_ticket" ("order_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_support_ticket_order_item_id"
        ON "support_ticket" ("order_item_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_support_ticket_order_item_id";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_support_ticket_order_id";`,
    );
    await queryRunner.query(`
      ALTER TABLE "support_ticket"
        DROP CONSTRAINT IF EXISTS "FK_support_ticket_order_item",
        DROP CONSTRAINT IF EXISTS "FK_support_ticket_order",
        DROP COLUMN IF EXISTS "claimCategory",
        DROP COLUMN IF EXISTS "order_item_id",
        DROP COLUMN IF EXISTS "order_id";
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_return_item_order_item_id";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "return_item";`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_refund_line_order_item_id";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_refund_line_operation_id";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "refund_line";`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_refund_operation_providerRefundId";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_refund_operation_order_id";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "refund_operation";`);

    await queryRunner.query(`DROP TYPE IF EXISTS "claim_category_enum";`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "inventory_disposition_enum";`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "return_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "refund_status_enum";`);
  }
}
