import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

/**
 * Adds durable consumer claims for delivered domain events (FND-03).
 *
 * Events dispatched before this release were delivered at least once with no
 * record of which consumer handled them; the table starts empty, so a pending
 * event redelivered after the upgrade may repeat a notification once.
 */
export class ProcessedEvents1789300000000 implements MigrationInterface {
  name = "ProcessedEvents1789300000000";

  /** Creates the claim table; no existing row is modified. */
  async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.tables WHERE table_name = 'processed_event'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "processed_event" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "consumer" character varying(128) NOT NULL,
        "eventId" character varying(64) NOT NULL,
        "eventType" character varying(128) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_processed_event_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_processed_event_consumer_event" UNIQUE ("consumer", "eventId")
      )`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_processed_event_event"
      ON "processed_event" ("eventId")`);
  }

  /** Removes the claim table; outbox events keep their own status. */
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_processed_event_event"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_event"`);
  }
}
