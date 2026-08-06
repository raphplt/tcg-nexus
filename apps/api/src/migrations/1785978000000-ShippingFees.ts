import { MigrationInterface, QueryRunner } from "typeorm";

export class ShippingFees1785978000000 implements MigrationInterface {
  name = "ShippingFees1785978000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "listing"
        ADD COLUMN IF NOT EXISTS "shippingCost" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "handlingTimeDays" integer NOT NULL DEFAULT 3
    `);
    await queryRunner.query(`
      ALTER TABLE "order"
        ADD COLUMN IF NOT EXISTS "shippingAmount" numeric(12,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "order_item"
        ADD COLUMN IF NOT EXISTS "shippingCost" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "handlingTimeDays" integer NOT NULL DEFAULT 3
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order_item"
        DROP COLUMN IF EXISTS "shippingCost",
        DROP COLUMN IF EXISTS "handlingTimeDays"
    `);
    await queryRunner.query(`
      ALTER TABLE "order" DROP COLUMN IF EXISTS "shippingAmount"
    `);
    await queryRunner.query(`
      ALTER TABLE "listing"
        DROP COLUMN IF EXISTS "shippingCost",
        DROP COLUMN IF EXISTS "handlingTimeDays"
    `);
  }
}
