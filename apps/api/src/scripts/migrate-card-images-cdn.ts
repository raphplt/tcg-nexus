import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";

dotenv.config();

/**
 * Bascule en base le champ `card.image` des cartes depuis l'origine TCGdex
 * (`https://assets.tcgdex.net/...`) vers le CDN R2
 * (`https://cdn.tcg-nexus.org/cards/...`), en cohérence avec les clés générées
 * par le backfill `apps/fetch/migrate-card-images-r2.ts`.
 *
 * ⚠️ À LANCER UNIQUEMENT APRÈS un backfill R2 complet (le script de fetch doit
 * reporter « échecs 0 »), sinon des cartes pointeraient vers des objets R2
 * inexistants. Le backfill est reprenable : relance-le jusqu'à 0 échec.
 *
 * Idempotent : ne touche que les lignes encore sur l'hôte TCGdex.
 *
 * Usage : `npm run migrate:card-images-cdn`
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
