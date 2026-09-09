import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

/**
 * Adds checkout attempt identity and capture compensation tracking (MKT-01, OPS-01).
 *
 * Existing attempts carry no fingerprint, so they keep resuming as before; only
 * checkouts started after this release refuse a key reused for another cart.
 */
export class CheckoutRecoveryAndCompensation1789200000000
  implements MigrationInterface
{
  name = "CheckoutRecoveryAndCompensation1789200000000";

  /** Extends existing installations; every added column is nullable. */
  async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'payment_transaction' AND column_name = 'compensationRequiredAt'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`ALTER TABLE "order"
      ADD COLUMN IF NOT EXISTS "checkoutFingerprint" character varying(64)`);
    await queryRunner.query(`ALTER TABLE "payment_transaction"
      ADD COLUMN IF NOT EXISTS "compensationRequiredAt" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "compensationReason" text,
      ADD COLUMN IF NOT EXISTS "compensatedAt" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payment_transaction_compensation"
      ON "payment_transaction" ("compensationRequiredAt")
      WHERE "compensatedAt" IS NULL`);
  }

  /** Removes only what this release added; payments keep their status. */
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payment_transaction_compensation"`,
    );
    await queryRunner.query(`ALTER TABLE "payment_transaction"
      DROP COLUMN IF EXISTS "compensatedAt",
      DROP COLUMN IF EXISTS "compensationReason",
      DROP COLUMN IF EXISTS "compensationRequiredAt"`);
    await queryRunner.query(`ALTER TABLE "order"
      DROP COLUMN IF EXISTS "checkoutFingerprint"`);
  }
}
