import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration 1786200000000:
 * - Creates seller_settlement_account, seller_allocation, and seller_payout tables (MKT-06).
 * - Creates seller_review table for verified buyer reviews and seller trust metrics (MKT-03).
 * - Adds photo_urls, defects, and defect_description to listing table (MKT-03).
 * - Adds listing_photo_urls and listing_defects to order_item table for purchase evidence snapshots (MKT-03).
 */
export class SellerSettlementAndTrust1786200000000
  implements MigrationInterface
{
  name = "SellerSettlementAndTrust1786200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create seller_settlement_account table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seller_settlement_account" (
        "id" SERIAL PRIMARY KEY,
        "seller_id" integer NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'EUR',
        "status" character varying(50) NOT NULL DEFAULT 'pending_onboarding',
        "payout_method" character varying(50) NOT NULL DEFAULT 'bank_transfer',
        "payout_details" jsonb,
        "balance_pending" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "balance_available" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "balance_paid_out" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "balance_on_hold" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "minimum_payout_amount" numeric(10, 2) NOT NULL DEFAULT 10.00,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_seller_settlement_account_seller_currency" UNIQUE ("seller_id", "currency"),
        CONSTRAINT "FK_seller_settlement_account_seller" FOREIGN KEY ("seller_id") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seller_settlement_account_seller"
      ON "seller_settlement_account" ("seller_id");
    `);

    // 2. Create seller_allocation table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seller_allocation" (
        "id" SERIAL PRIMARY KEY,
        "order_id" integer NOT NULL,
        "seller_id" integer NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'EUR',
        "gross_amount" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "shipping_amount" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "commission_rate" numeric(5, 4) NOT NULL DEFAULT 0.0500,
        "commission_amount" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "net_amount" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "refunded_amount" numeric(12, 2) NOT NULL DEFAULT 0.00,
        "status" character varying(50) NOT NULL DEFAULT 'pending_delivery',
        "eligible_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_seller_allocation_order" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_seller_allocation_seller" FOREIGN KEY ("seller_id") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seller_allocation_order"
      ON "seller_allocation" ("order_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seller_allocation_seller_status"
      ON "seller_allocation" ("seller_id", "status");
    `);

    // 3. Create seller_payout table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seller_payout" (
        "id" SERIAL PRIMARY KEY,
        "seller_id" integer NOT NULL,
        "account_id" integer,
        "currency" character varying(10) NOT NULL DEFAULT 'EUR',
        "amount" numeric(12, 2) NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'requested',
        "reference" character varying(100) NOT NULL UNIQUE,
        "payout_method" character varying(50) NOT NULL DEFAULT 'bank_transfer',
        "payout_destination_snapshot" jsonb,
        "processed_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "failure_reason" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_seller_payout_seller" FOREIGN KEY ("seller_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_seller_payout_account" FOREIGN KEY ("account_id") REFERENCES "seller_settlement_account"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seller_payout_seller_status"
      ON "seller_payout" ("seller_id", "status");
    `);

    // 4. Create seller_review table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seller_review" (
        "id" SERIAL PRIMARY KEY,
        "seller_id" integer NOT NULL,
        "buyer_id" integer NOT NULL,
        "order_id" integer NOT NULL,
        "order_item_id" integer NOT NULL UNIQUE,
        "rating" integer NOT NULL,
        "comment" text,
        "verified_purchase" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_seller_review_seller" FOREIGN KEY ("seller_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_seller_review_buyer" FOREIGN KEY ("buyer_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_seller_review_order" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_seller_review_order_item" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seller_review_seller"
      ON "seller_review" ("seller_id");
    `);

    // 5. Alter listing table for evidence & defects
    await queryRunner.query(`
      ALTER TABLE "listing"
      ADD COLUMN IF NOT EXISTS "photo_urls" jsonb,
      ADD COLUMN IF NOT EXISTS "defects" jsonb,
      ADD COLUMN IF NOT EXISTS "defect_description" text;
    `);

    // 6. Alter order_item table for purchase evidence snapshots
    await queryRunner.query(`
      ALTER TABLE "order_item"
      ADD COLUMN IF NOT EXISTS "listing_photo_urls" jsonb,
      ADD COLUMN IF NOT EXISTS "listing_defects" jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order_item"
      DROP COLUMN IF EXISTS "listing_defects",
      DROP COLUMN IF EXISTS "listing_photo_urls";
    `);

    await queryRunner.query(`
      ALTER TABLE "listing"
      DROP COLUMN IF EXISTS "defect_description",
      DROP COLUMN IF EXISTS "defects",
      DROP COLUMN IF EXISTS "photo_urls";
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "seller_review" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "seller_payout" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "seller_allocation" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "seller_settlement_account" CASCADE;`);
  }
}
