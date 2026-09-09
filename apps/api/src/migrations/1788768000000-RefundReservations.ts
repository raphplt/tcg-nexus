import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

/** Adds durable refund identities without rewriting historical financial records. */
export class RefundReservations1788768000000 implements MigrationInterface {
  name = "RefundReservations1788768000000";

  /** Extends existing installations; nullable identities preserve legacy refunds for review. */
  async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'refund_operation' AND column_name = 'requestKey'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`ALTER TABLE "refund_operation"
      ADD COLUMN "requestKey" varchar(128),
      ADD COLUMN "fingerprint" varchar(64),
      ADD COLUMN "paymentIntentId" varchar(128),
      ADD COLUMN "providerAttemptedAt" timestamptz,
      ADD COLUMN "failureReason" text,
      ADD COLUMN "orderStatusBeforeFullRefund" varchar(32)`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_refund_order_request_key" ON "refund_operation" ("order_id", "requestKey")`,
    );
  }

  /** Removes only the new reservation metadata when explicitly rolling back this release. */
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_refund_order_request_key"`);
    await queryRunner.query(`ALTER TABLE "refund_operation"
      DROP COLUMN "orderStatusBeforeFullRefund",
      DROP COLUMN "failureReason",
      DROP COLUMN "providerAttemptedAt",
      DROP COLUMN "paymentIntentId",
      DROP COLUMN "fingerprint",
      DROP COLUMN "requestKey"`);
  }
}
