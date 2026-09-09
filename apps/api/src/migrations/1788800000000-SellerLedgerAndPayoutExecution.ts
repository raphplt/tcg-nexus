import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

/**
 * Adds the append-only seller ledger and the payout execution identities (MKT-06).
 *
 * Existing balances are adopted as one opening entry per account so the ledger
 * explains the funds already recorded, and reconciliation is meaningful from the
 * first release rather than only for later movements.
 */
export class SellerLedgerAndPayoutExecution1788800000000
  implements MigrationInterface
{
  name = "SellerLedgerAndPayoutExecution1788800000000";

  /** Extends existing installations; every added column is nullable or defaulted. */
  async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_ledger_entry'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`ALTER TABLE "seller_payout"
      ADD COLUMN IF NOT EXISTS "requestKey" character varying(128),
      ADD COLUMN IF NOT EXISTS "providerAccountId" character varying(128),
      ADD COLUMN IF NOT EXISTS "providerTransferId" character varying(128),
      ADD COLUMN IF NOT EXISTS "providerAttemptedAt" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "transactionReference" character varying(190)`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_payout_seller_request_key"
      ON "seller_payout" ("seller_id", "requestKey")`);

    await queryRunner.query(`ALTER TABLE "seller_allocation"
      ADD COLUMN IF NOT EXISTS "commissionReversedAmount" numeric(12, 2) NOT NULL DEFAULT 0.00`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seller_ledger_entry" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "account_id" integer NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'EUR',
        "kind" character varying(40) NOT NULL,
        "deltaPendingCents" integer NOT NULL DEFAULT 0,
        "deltaAvailableCents" integer NOT NULL DEFAULT 0,
        "deltaOnHoldCents" integer NOT NULL DEFAULT 0,
        "deltaPaidOutCents" integer NOT NULL DEFAULT 0,
        "allocation_id" integer,
        "payout_id" integer,
        "refundOperationId" character varying(64),
        "requestKey" character varying(160) NOT NULL,
        "reason" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_seller_ledger_entry_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_seller_ledger_entry_account_request_key" UNIQUE ("account_id", "requestKey"),
        CONSTRAINT "FK_seller_ledger_entry_account" FOREIGN KEY ("account_id")
          REFERENCES "seller_settlement_account"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_seller_ledger_entry_allocation" FOREIGN KEY ("allocation_id")
          REFERENCES "seller_allocation"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_seller_ledger_entry_payout" FOREIGN KEY ("payout_id")
          REFERENCES "seller_payout"("id") ON DELETE SET NULL
      )`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seller_ledger_entry_account_created"
      ON "seller_ledger_entry" ("account_id", "createdAt")`);

    // Installations differ in balance column naming until the schema baseline of
    // block 7 lands, so the adoption entry resolves the actual columns first.
    await queryRunner.query(`
      DO $$
      DECLARE
        pending text;
        available text;
        on_hold text;
        paid_out text;
        currency_type text;
      BEGIN
        SELECT quote_ident(column_name) INTO pending FROM information_schema.columns
          WHERE table_name = 'seller_settlement_account'
            AND column_name IN ('balancePending', 'balance_pending') LIMIT 1;
        SELECT quote_ident(column_name) INTO available FROM information_schema.columns
          WHERE table_name = 'seller_settlement_account'
            AND column_name IN ('balanceAvailable', 'balance_available') LIMIT 1;
        SELECT quote_ident(column_name) INTO on_hold FROM information_schema.columns
          WHERE table_name = 'seller_settlement_account'
            AND column_name IN ('balanceOnHold', 'balance_on_hold') LIMIT 1;
        SELECT quote_ident(column_name) INTO paid_out FROM information_schema.columns
          WHERE table_name = 'seller_settlement_account'
            AND column_name IN ('balancePaidOut', 'balance_paid_out') LIMIT 1;
        IF pending IS NULL OR available IS NULL OR on_hold IS NULL OR paid_out IS NULL THEN
          RAISE EXCEPTION 'seller_settlement_account balance columns are missing';
        END IF;
        -- The currency column is an enum under a synchronized schema and a
        -- varchar under the migrated one, so the copy casts through text.
        SELECT format_type(atttypid, atttypmod) INTO currency_type
          FROM pg_attribute
         WHERE attrelid = 'seller_ledger_entry'::regclass AND attname = 'currency';
        EXECUTE format(
          'INSERT INTO "seller_ledger_entry"
             ("account_id", "currency", "kind", "deltaPendingCents", "deltaAvailableCents",
              "deltaOnHoldCents", "deltaPaidOutCents", "requestKey", "reason")
           SELECT a."id", (a."currency"::text)::%5$s, ''opening_balance'',
                  round(a.%1$s * 100), round(a.%2$s * 100),
                  round(a.%3$s * 100), round(a.%4$s * 100),
                  ''account:'' || a."id" || '':opening'',
                  ''Balance recorded before the ledger was introduced''
             FROM "seller_settlement_account" a
            WHERE a.%1$s <> 0 OR a.%2$s <> 0 OR a.%3$s <> 0 OR a.%4$s <> 0
           ON CONFLICT DO NOTHING',
          pending, available, on_hold, paid_out, currency_type);
      END $$;`);
  }

  /** Removes only what this release added; adopted balances stay on the accounts. */
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_seller_ledger_entry_account_created"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "seller_ledger_entry"`);
    await queryRunner.query(`ALTER TABLE "seller_allocation"
      DROP COLUMN IF EXISTS "commissionReversedAmount"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_seller_payout_seller_request_key"`,
    );
    await queryRunner.query(`ALTER TABLE "seller_payout"
      DROP COLUMN IF EXISTS "transactionReference",
      DROP COLUMN IF EXISTS "providerAttemptedAt",
      DROP COLUMN IF EXISTS "providerTransferId",
      DROP COLUMN IF EXISTS "providerAccountId",
      DROP COLUMN IF EXISTS "requestKey"`);
  }
}
