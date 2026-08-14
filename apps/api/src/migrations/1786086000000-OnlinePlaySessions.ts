import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates the three tables backing online play: matchmaking (casual), tournament
 * matches and solo training.
 *
 * These tables previously existed only through `synchronize`, which is disabled
 * in production — the whole online mode was therefore unavailable there.
 *
 * Every statement is idempotent so the migration can also run against
 * development databases where `synchronize` already created the schema.
 */
export class OnlinePlaySessions1786086000000 implements MigrationInterface {
  name = "OnlinePlaySessions1786086000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "casual_match_session_status_enum" AS ENUM ('WAITING_FOR_DECKS', 'ACTIVE', 'FINISHED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "online_match_session_status_enum" AS ENUM ('WAITING_FOR_DECKS', 'ACTIVE', 'FINISHED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "training_match_session_status_enum" AS ENUM ('ACTIVE', 'FINISHED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "training_match_session_aidifficulty_enum" AS ENUM ('easy', 'standard');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "casual_match_session" (
        "id" SERIAL NOT NULL,
        "status" "casual_match_session_status_enum" NOT NULL DEFAULT 'WAITING_FOR_DECKS',
        "seed" bigint NOT NULL,
        "isRanked" boolean NOT NULL DEFAULT false,
        "playerADeckId" integer,
        "playerBDeckId" integer,
        "winnerUserId" integer,
        "endedReason" character varying,
        "serializedState" jsonb,
        "eventLog" jsonb NOT NULL DEFAULT '[]',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "playerAId" integer,
        "playerBId" integer,
        CONSTRAINT "PK_3936ad6d5be291d4f2e1c663612" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "online_match_session" (
        "id" SERIAL NOT NULL,
        "status" "online_match_session_status_enum" NOT NULL DEFAULT 'WAITING_FOR_DECKS',
        "seed" bigint NOT NULL,
        "playerADeckId" integer,
        "playerBDeckId" integer,
        "winnerPlayerId" integer,
        "endedReason" character varying,
        "serializedState" jsonb,
        "eventLog" jsonb NOT NULL DEFAULT '[]',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "match_id" integer,
        CONSTRAINT "PK_f665d6c4bc7d9e554362b6e5b8b" PRIMARY KEY ("id"),
        CONSTRAINT "REL_9a3fe980980546a14f707b99df" UNIQUE ("match_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "training_match_session" (
        "id" SERIAL NOT NULL,
        "status" "training_match_session_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "seed" bigint NOT NULL,
        "playerDeckId" integer NOT NULL,
        "aiDeckPresetId" character varying(100) NOT NULL,
        "aiDifficulty" "training_match_session_aidifficulty_enum" NOT NULL,
        "serializedState" jsonb NOT NULL,
        "eventLog" jsonb NOT NULL DEFAULT '[]',
        "winnerSide" character varying,
        "endedReason" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" integer,
        CONSTRAINT "PK_048189a70b51f91d54898f0b8f5" PRIMARY KEY ("id")
      )
    `);

    // Foreign keys are added separately: `ADD CONSTRAINT IF NOT EXISTS` does not
    // exist in PostgreSQL 15, so each one is guarded by a catalog lookup.
    await this.addForeignKeyIfMissing(
      queryRunner,
      "casual_match_session",
      "FK_cce40ccf11129549df36b5f6689",
      `FOREIGN KEY ("playerAId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "casual_match_session",
      "FK_422a73906493943edebf855b3e4",
      `FOREIGN KEY ("playerBId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "online_match_session",
      "FK_9a3fe980980546a14f707b99df4",
      `FOREIGN KEY ("match_id") REFERENCES "match"("id") ON DELETE CASCADE`,
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "training_match_session",
      "FK_1d7839a8706133733e675d26dd0",
      `FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "training_match_session"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "online_match_session"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "casual_match_session"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "training_match_session_aidifficulty_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "training_match_session_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "online_match_session_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "casual_match_session_status_enum"`,
    );
  }

  private async addForeignKeyIfMissing(
    queryRunner: QueryRunner,
    table: string,
    constraintName: string,
    definition: string,
  ): Promise<void> {
    const [existing] = await queryRunner.query(
      `SELECT 1 FROM pg_constraint WHERE conname = $1`,
      [constraintName],
    );

    if (existing) {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE "${table}" ADD CONSTRAINT "${constraintName}" ${definition}`,
    );
  }
}
