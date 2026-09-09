import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds the deck archetype vectors that back local deck similarity (AI-03).
 *
 * A deck vector is the quantity-weighted mean of its cards' visual embeddings,
 * so the table mirrors `card_embedding`: same dimension, same cosine index.
 *
 * pgvector may be absent on a lean installation. The migration skips the whole
 * table in that case rather than failing the run — deck similarity then reports
 * itself unavailable instead of taking the API down with it.
 */
export class DeckEmbeddings1789600000000 implements MigrationInterface {
  name = "DeckEmbeddings1789600000000";

  /** Dimension of the CLIP vectors served by the vision service. */
  private static readonly EMBED_DIM = 512;

  private async hasVector(queryRunner: QueryRunner): Promise<boolean> {
    const rows = await queryRunner.query(
      `SELECT 1 FROM pg_extension WHERE extname = 'vector'`,
    );
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    } catch {
      // Extension not installable here; the guard below skips the table.
    }

    if (!(await this.hasVector(queryRunner))) return;

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS deck_embedding (
         deck_id integer PRIMARY KEY REFERENCES deck(id) ON DELETE CASCADE,
         embedding vector(${DeckEmbeddings1789600000000.EMBED_DIM}) NOT NULL,
         card_count integer NOT NULL DEFAULT 0,
         covered_cards integer NOT NULL DEFAULT 0,
         deck_updated_at timestamptz,
         updated_at timestamptz NOT NULL DEFAULT now()
       )`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS deck_embedding_hnsw
         ON deck_embedding USING hnsw (embedding vector_cosine_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS deck_embedding_hnsw`);
    await queryRunner.query(`DROP TABLE IF EXISTS deck_embedding`);
  }
}
