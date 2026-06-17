/**
 * Pré-calcul des embeddings d'images de cartes (recherche visuelle, P6).
 * Télécharge low.png de chaque carte, l'envoie au service vision /embed, et
 * stocke le vecteur dans card_embedding (pgvector). Reprenable (saute les
 * cartes déjà vectorisées).
 *
 *   npm run embed:cards -- --sets=base1,jungle      # sous-ensemble
 *   npm run embed:cards -- --limit=2000             # n premières non faites
 *   npm run embed:cards -- --all
 */
import "dotenv/config";
import { Client } from "pg";

const VISION = process.env.VISION_SERVICE_URL ?? "http://localhost:8000";
const LEGACY_R2 = "pub-27752f7846b4433d8e74edcc8bdc1dc8.r2.dev";

const arg = (k: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];

// URL de l'image catalogue (base sans extension -> .../low.png)
const lowUrl = (base: string): string => {
  const host = base.includes(LEGACY_R2)
    ? base.replace(LEGACY_R2, "cdn.tcg-nexus.org")
    : base;
  return `${host}/low.png`;
};

const downloadB64 = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {
    return null;
  }
};

const embed = async (images: string[]): Promise<number[][]> => {
  const res = await fetch(`${VISION}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });
  if (!res.ok) throw new Error(`vision /embed HTTP ${res.status}`);
  const data = (await res.json()) as { embeddings: number[][] };
  return data.embeddings ?? [];
};

async function main() {
  const sets = arg("sets")?.split(",").filter(Boolean);
  const limit = arg("limit") ? Number(arg("limit")) : undefined;
  const batch = arg("batch") ? Number(arg("batch")) : 16;

  const db = new Client({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  await db.connect();

  // table d'embeddings auto-créée si la machine ne l'a pas encore (idempotent)
  await db.query("CREATE EXTENSION IF NOT EXISTS vector");
  await db.query(
    `CREATE TABLE IF NOT EXISTS card_embedding (
       card_id uuid PRIMARY KEY REFERENCES card(id) ON DELETE CASCADE,
       embedding vector(512),
       updated_at timestamptz DEFAULT now()
     )`,
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS card_embedding_hnsw
       ON card_embedding USING hnsw (embedding vector_cosine_ops)`,
  );

  const params: unknown[] = [];
  let where = `c.image IS NOT NULL AND e.card_id IS NULL`;
  if (sets?.length) {
    params.push(sets);
    where += ` AND c."setId" = ANY($${params.length})`;
  }
  const sql =
    `SELECT c.id, c.image FROM card c ` +
    `LEFT JOIN card_embedding e ON e.card_id = c.id WHERE ${where} ` +
    `ORDER BY c."setId"` +
    (limit ? ` LIMIT ${limit}` : "");
  const { rows } = await db.query<{ id: string; image: string }>(sql, params);

  console.log(`À vectoriser : ${rows.length} cartes (vision ${VISION})`);
  let done = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += batch) {
    const slice = rows.slice(i, i + batch);
    const imgs = await Promise.all(slice.map((r) => downloadB64(lowUrl(r.image))));
    const ok = slice
      .map((r, j) => ({ id: r.id, b64: imgs[j] }))
      .filter((x): x is { id: string; b64: string } => Boolean(x.b64));
    failed += slice.length - ok.length;
    if (ok.length === 0) continue;

    let vectors: number[][];
    try {
      vectors = await embed(ok.map((x) => x.b64));
    } catch (e) {
      console.error(`Batch ${i} KO: ${(e as Error).message}`);
      continue;
    }

    for (let j = 0; j < ok.length; j++) {
      const vec = vectors[j];
      if (!vec?.length) continue;
      await db.query(
        `INSERT INTO card_embedding (card_id, embedding) VALUES ($1, $2::vector)
         ON CONFLICT (card_id) DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = now()`,
        [ok[j].id, `[${vec.join(",")}]`],
      );
      done++;
    }
    if (i % (batch * 10) === 0 || i + batch >= rows.length)
      console.log(`  ${done}/${rows.length} (échecs DL: ${failed})`);
  }

  console.log(`Terminé : ${done} vectorisées, ${failed} images indisponibles.`);
  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
