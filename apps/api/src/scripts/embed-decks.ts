/**
 * Precomputes deck archetype vectors (local similarity, AI-03).
 *
 * A deck's vector is the quantity-weighted average of the visual embeddings
 * of its cards, already stored in `card_embedding` by
 * `npm run embed:cards`. Everything is computed in PostgreSQL: no call to the
 * vision service, no network call.
 *
 *   npm run embed:decks                    # decks not yet embedded or stale
 *   npm run embed:decks -- --all           # all decks
 *   npm run embed:decks -- --public-only   # public decks only
 *   npm run embed:decks -- --limit=500
 *
 * ⚠️ Never restore these vectors from an export: they are regenerated.
 */
import "dotenv/config";
import { Client } from "pg";

/** Dimension of the CLIP vectors served by the vision service. */
const EMBED_DIM = 512;

const arg = (key: string): string | undefined =>
  process.argv.find((value) => value.startsWith(`--${key}=`))?.split("=")[1];

const main = async (): Promise<void> => {
  const all = process.argv.includes("--all");
  const publicOnly = process.argv.includes("--public-only");
  const limit = Number(arg("limit")) || 0;

  const db = new Client({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  await db.connect();

  try {
    await db.query("CREATE EXTENSION IF NOT EXISTS vector");
  } catch (error) {
    console.error(
      `pgvector indisponible : ${(error as Error).message}\n` +
        "La similarité de decks restera désactivée.",
    );
    await db.end();
    process.exitCode = 1;
    return;
  }

  await db.query(
    `CREATE TABLE IF NOT EXISTS deck_embedding (
       deck_id integer PRIMARY KEY REFERENCES deck(id) ON DELETE CASCADE,
       embedding vector(${EMBED_DIM}) NOT NULL,
       card_count integer NOT NULL DEFAULT 0,
       covered_cards integer NOT NULL DEFAULT 0,
       deck_updated_at timestamptz,
       updated_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS deck_embedding_hnsw
       ON deck_embedding USING hnsw (embedding vector_cosine_ops)`,
  );

  // A deck needs re-embedding if it has no vector, or if its content has
  // changed since: `deck.updatedAt` is authoritative.
  const staleness = all
    ? "TRUE"
    : `(de.deck_id IS NULL OR de.deck_updated_at IS DISTINCT FROM d."updatedAt")`;

  const { rows } = await db.query<{ id: number }>(
    `SELECT d.id
     FROM deck d
     LEFT JOIN deck_embedding de ON de.deck_id = d.id
     WHERE ${staleness}${publicOnly ? ' AND d."isPublic" = true' : ""}
     ORDER BY d.id${limit ? ` LIMIT ${limit}` : ""}`,
  );

  console.log(`À vectoriser : ${rows.length} deck(s)`);

  let stored = 0;
  let skipped = 0;

  for (const { id } of rows) {
    const result = await db.query<{ covered_cards: number }>(
      `WITH covered AS (
         SELECT dc.qty, ce.embedding
         FROM deck_card dc
         JOIN card_embedding ce ON ce.card_id = dc."cardId"
         LEFT JOIN pokemon_card_details p ON p.card_id = dc."cardId"
         WHERE dc."deckId" = $1
           -- Les énergies de base sont dans presque tous les decks : les
           -- moyenner rapproche artificiellement tous les archétypes.
           AND NOT (p.category = 'Energy' AND p."energyType" IS NOT NULL)
       ),
       -- Une ligne par exemplaire : AVG devient une moyenne pondérée par les
       -- quantités, sinon 4 Dracaufeu pèsent autant qu'un seul.
       expanded AS (
         SELECT covered.embedding
         FROM covered
         CROSS JOIN LATERAL generate_series(1, GREATEST(covered.qty, 1))
       ),
       totals AS (
         SELECT
           (SELECT COALESCE(SUM(qty), 0) FROM deck_card WHERE "deckId" = $1) AS card_count,
           (SELECT COALESCE(SUM(qty), 0) FROM covered) AS covered_cards
       )
       INSERT INTO deck_embedding (deck_id, embedding, card_count, covered_cards, deck_updated_at, updated_at)
       SELECT
         $1,
         (SELECT AVG(embedding) FROM expanded),
         totals.card_count,
         totals.covered_cards,
         (SELECT "updatedAt" FROM deck WHERE id = $1),
         now()
       FROM totals
       WHERE totals.covered_cards > 0
       ON CONFLICT (deck_id) DO UPDATE SET
         embedding = EXCLUDED.embedding,
         card_count = EXCLUDED.card_count,
         covered_cards = EXCLUDED.covered_cards,
         deck_updated_at = EXCLUDED.deck_updated_at,
         updated_at = now()
       RETURNING covered_cards`,
      [id],
    );

    if (result.rows.length) stored++;
    else skipped++;
  }

  console.log(
    `Vectorisés : ${stored} — ignorés (aucune carte vectorisée) : ${skipped}`,
  );
  if (skipped) {
    console.log("Lancez `npm run embed:cards` pour couvrir plus de cartes.");
  }

  await db.end();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
