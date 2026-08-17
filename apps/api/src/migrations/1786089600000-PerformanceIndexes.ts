import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds indexes for ranking windows and paginated deck access paths.
 */
export class PerformanceIndexes1786089600000 implements MigrationInterface {
  name = "PerformanceIndexes1786089600000";

  /**
   * Creates indexes used by high-traffic ranking and deck queries.
   *
   * @param queryRunner Active migration query runner.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ranked_match_history" ADD COLUMN IF NOT EXISTS "matchId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "ranked_match_history" ADD COLUMN IF NOT EXISTS "casualSessionId" integer`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ranked_history_created_at" ON "ranked_match_history" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ranked_history_match_id" ON "ranked_match_history" ("matchId") WHERE "matchId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ranked_history_casual_session_id" ON "ranked_match_history" ("casualSessionId") WHERE "casualSessionId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_player_elo_id" ON "player" ("elo" DESC, "id" ASC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_deck_public_created_at" ON "deck" ("isPublic", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_deck_user_created_at" ON "deck" ("userId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_deck_card_deck_id" ON "deck_card" ("deckId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_deck_card_deck_card" ON "deck_card" ("deckId", "cardId")`,
    );
  }

  /**
   * Removes performance indexes created by this migration.
   *
   * @param queryRunner Active migration query runner.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deck_card_deck_card"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deck_card_deck_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deck_user_created_at"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_deck_public_created_at"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_player_elo_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ranked_history_casual_session_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ranked_history_match_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ranked_history_created_at"`,
    );
  }
}
