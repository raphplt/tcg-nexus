import { MigrationInterface, QueryRunner } from "typeorm";

export class MarketplaceCheckout1785974400000 implements MigrationInterface {
  name = "MarketplaceCheckout1785974400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "listing_status_enum" AS ENUM ('active', 'inactive');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "order_item_fulfillmentstatus_enum" AS ENUM
          ('to_ship', 'preparing', 'shipped', 'delivered', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "order_item_productkind_enum" AS ENUM ('card', 'sealed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "payment_transaction_currency_enum" AS ENUM
          ('EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "listing"
        ADD COLUMN IF NOT EXISTS "status" "listing_status_enum" NOT NULL DEFAULT 'active'
    `);

    await queryRunner.query(`
      ALTER TYPE "order_status_enum" ADD VALUE IF NOT EXISTS 'Delivered' AFTER 'Shipped'
    `);
    await queryRunner.query(`
      ALTER TABLE "order"
        ADD COLUMN IF NOT EXISTS "shippingAddress" text NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "reservationExpiresAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "stockReleased" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_order_status" ON "order" ("status")
    `);

    await queryRunner.query(`
      ALTER TABLE "order_item"
        ADD COLUMN IF NOT EXISTS "seller_id" integer,
        ADD COLUMN IF NOT EXISTS "productKind" "order_item_productkind_enum" NOT NULL DEFAULT 'card',
        ADD COLUMN IF NOT EXISTS "productName" character varying(255) NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "productImage" character varying(512),
        ADD COLUMN IF NOT EXISTS "productCondition" character varying(64),
        ADD COLUMN IF NOT EXISTS "productLanguage" character varying(16),
        ADD COLUMN IF NOT EXISTS "productSetName" character varying(255),
        ADD COLUMN IF NOT EXISTS "sellerName" character varying(255) NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "fulfillmentStatus" "order_item_fulfillmentstatus_enum" NOT NULL DEFAULT 'to_ship',
        ADD COLUMN IF NOT EXISTS "carrier" character varying(64),
        ADD COLUMN IF NOT EXISTS "trackingNumber" character varying(128),
        ADD COLUMN IF NOT EXISTS "shippedAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_order_item_seller" ON "order_item" ("seller_id")
    `);

    await this.dropForeignKey(queryRunner, "order_item", "listing_id");
    await queryRunner.query(`
      ALTER TABLE "order_item" ALTER COLUMN "listing_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "order_item"
        ADD CONSTRAINT "FK_order_item_listing"
        FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "order_item"
        ADD CONSTRAINT "FK_order_item_seller"
        FOREIGN KEY ("seller_id") REFERENCES "user"("id") ON DELETE SET NULL
    `);

    // les lignes déjà en base n'ont pas de snapshot : on le reconstruit depuis le listing
    await queryRunner.query(`
      UPDATE "order_item" oi
      SET "seller_id" = l."seller_id",
          "productKind" = l."productKind"::text::"order_item_productkind_enum"
      FROM "listing" l
      WHERE oi."listing_id" = l."id" AND oi."seller_id" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "payment_transaction"
        ADD COLUMN IF NOT EXISTS "currency" "payment_transaction_currency_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_transaction"
        ALTER COLUMN "transactionId" TYPE character varying(255)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payment_transaction_transactionId"
        ON "payment_transaction" ("transactionId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_payment_transaction_transactionId"
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_transaction" DROP COLUMN IF EXISTS "currency"
    `);

    await queryRunner.query(`
      ALTER TABLE "order_item" DROP CONSTRAINT IF EXISTS "FK_order_item_seller"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_item_seller"`);
    await queryRunner.query(`
      ALTER TABLE "order_item"
        DROP COLUMN IF EXISTS "seller_id",
        DROP COLUMN IF EXISTS "productKind",
        DROP COLUMN IF EXISTS "productName",
        DROP COLUMN IF EXISTS "productImage",
        DROP COLUMN IF EXISTS "productCondition",
        DROP COLUMN IF EXISTS "productLanguage",
        DROP COLUMN IF EXISTS "productSetName",
        DROP COLUMN IF EXISTS "sellerName",
        DROP COLUMN IF EXISTS "fulfillmentStatus",
        DROP COLUMN IF EXISTS "carrier",
        DROP COLUMN IF EXISTS "trackingNumber",
        DROP COLUMN IF EXISTS "shippedAt",
        DROP COLUMN IF EXISTS "deliveredAt"
    `);
    await queryRunner.query(`
      DELETE FROM "order_item" WHERE "listing_id" IS NULL
    `);
    await this.dropForeignKey(queryRunner, "order_item", "listing_id");
    await queryRunner.query(`
      ALTER TABLE "order_item" ALTER COLUMN "listing_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "order_item"
        ADD CONSTRAINT "FK_order_item_listing"
        FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_status"`);
    await queryRunner.query(`
      ALTER TABLE "order"
        DROP COLUMN IF EXISTS "shippingAddress",
        DROP COLUMN IF EXISTS "reservationExpiresAt",
        DROP COLUMN IF EXISTS "stockReleased"
    `);

    await queryRunner.query(`
      ALTER TABLE "listing" DROP COLUMN IF EXISTS "status"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "listing_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "order_item_fulfillmentstatus_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "order_item_productkind_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "payment_transaction_currency_enum"`,
    );
  }

  // le nom de contrainte généré par synchronize est un hash, on le retrouve par la colonne
  private async dropForeignKey(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<void> {
    const rows: { conname: string }[] = await queryRunner.query(
      `
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE con.contype = 'f' AND rel.relname = $1 AND att.attname = $2
      `,
      [table, column],
    );

    for (const { conname } of rows) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT "${conname}"`,
      );
    }
  }
}
