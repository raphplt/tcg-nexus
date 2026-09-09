import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";

dotenv.config();

/**
 * Migrates database `card.image` paths from legacy TCGdex origin
 * (`https://assets.tcgdex.net/...`) to Cloudflare R2 CDN
 * (`https://cdn.tcg-nexus.org/cards/...`), consistent with keys generated
 * by the backfill script `apps/fetch/migrate-card-images-r2.ts`.
 *
 * NOTE: Run ONLY after completing a full R2 backfill (fetch script must
 * report 0 failures), otherwise card images will point to non-existent objects.
 *
 * Idempotent: only updates records still pointing to the TCGdex host.
 *
 * Usage: `npm run migrate:card-images-cdn`
 */

const FROM = "https://assets.tcgdex.net/";
const TO = "https://cdn.tcg-nexus.org/cards/";

const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  entities: [],
});

async function main() {
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();

    const before = await queryRunner.query(
      `SELECT COUNT(*)::int AS n FROM public.card WHERE image LIKE $1;`,
      [`%assets.tcgdex.net%`],
    );
    const toMigrate = Number(before[0]?.n ?? 0);
    console.log(`Cartes à migrer (image TCGdex -> CDN) : ${toMigrate}`);

    if (toMigrate === 0) {
      console.log("Rien à faire.");
      return;
    }

    const result = await queryRunner.query(
      `UPDATE public.card
         SET image = REPLACE(image, $1, $2)
       WHERE image LIKE $3
       RETURNING id;`,
      [FROM, TO, `%assets.tcgdex.net%`],
    );
    const affected = Array.isArray(result) ? result.length : 0;
    console.log(`✅ ${affected} carte(s) basculée(s) vers le CDN.`);
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error("❌ Migration échouée:", err);
  process.exit(1);
});
