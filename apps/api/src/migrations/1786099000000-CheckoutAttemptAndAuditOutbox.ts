import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

/**
 * Adds checkoutAttemptKey to order, and creates audit_event and outbox_event tables.
 */
export class CheckoutAttemptAndAuditOutbox1786099000000
  implements MigrationInterface
{
  name = "CheckoutAttemptAndAuditOutbox1786099000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'outbox_event'`,
      )
    ) {
      return;
    }

    // 1. Order checkoutAttemptKey
    await queryRunner.query(`
      ALTER TABLE "order"
        ADD COLUMN IF NOT EXISTS "checkoutAttemptKey" character varying(128);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_order_checkoutAttemptKey"
        ON "order" ("checkoutAttemptKey");
    `);

    // 2. Audit Event table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_event" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "actorId" integer,
        "actorRole" character varying(64),
        "targetType" character varying(64) NOT NULL,
        "targetId" character varying(128) NOT NULL,
        "action" character varying(64) NOT NULL,
        "reason" text,
        "correlationId" character varying(128),
        "beforeState" jsonb,
        "afterState" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_event_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_event_actorId"
        ON "audit_event" ("actorId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_event_target"
        ON "audit_event" ("targetType", "targetId");
    `);

    // 3. Outbox Event table
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "outbox_event_status_enum" AS ENUM ('pending', 'processed', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outbox_event" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "eventType" character varying(128) NOT NULL,
        "aggregateType" character varying(64) NOT NULL,
        "aggregateId" character varying(128) NOT NULL,
        "payload" jsonb NOT NULL,
        "status" "outbox_event_status_enum" NOT NULL DEFAULT 'pending',
        "retryCount" integer NOT NULL DEFAULT 0,
        "lastError" text,
        "processedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_outbox_event_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_outbox_event_eventType"
        ON "outbox_event" ("eventType");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_outbox_event_aggregate"
        ON "outbox_event" ("aggregateType", "aggregateId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_outbox_event_status"
        ON "outbox_event" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_outbox_event_status";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_outbox_event_aggregate";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_outbox_event_eventType";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "outbox_event";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "outbox_event_status_enum";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_event_target";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_event_actorId";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_event";`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_order_checkoutAttemptKey";`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP COLUMN IF EXISTS "checkoutAttemptKey";`,
    );
  }
}
