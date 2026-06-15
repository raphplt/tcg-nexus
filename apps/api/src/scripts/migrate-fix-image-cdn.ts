import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";

// Charge le .env local par défaut
dotenv.config();

/**
 * Migration ponctuelle : réécriture des URLs d'images stockées avec l'ancien
 * hôte R2 "public" (`*.r2.dev`, désactivé en prod) vers le domaine custom
 * `cdn.tcg-nexus.org`. Les objets vivent dans le même bucket : seul le préfixe
 * public a changé, donc un simple REPLACE suffit.
 *
 * Idempotent : peut être relancé sans risque (ne touche que les lignes encore
 * sur l'ancien hôte).
 *
 * Usage : `npm run migrate:fix-image-cdn` (ou ts-node sur ce fichier).
 */

const LEGACY_HOST = "pub-27752f7846b4433d8e74edcc8bdc1dc8.r2.dev";
const NEW_HOST = "cdn.tcg-nexus.org";

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

async function tableExists(queryRunner: any, table: string): Promise<boolean> {
  const rows = await queryRunner.query(
    `SELECT to_regclass('public.${table}') AS reg;`,
  );
  return Boolean(rows[0]?.reg);
}

async function columnExists(
  queryRunner: any,
  table: string,
  column: string,
): Promise<boolean> {
  const rows = await queryRunner.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1;`,
    [table, column],
  );
  return rows.length > 0;
}

/**
 * Réécrit l'hôte legacy -> CDN pour une colonne donnée et retourne le nombre de
 * lignes affectées.
 */
async function rewriteColumn(
  queryRunner: any,
  table: string,
  column: string,
): Promise<number> {
  if (!(await tableExists(queryRunner, table))) {
    console.log(`  (table ${table} absente — ignorée)`);
    return 0;
  }
  if (!(await columnExists(queryRunner, table, column))) {
    console.log(`  (colonne ${table}.${column} absente — ignorée)`);
    return 0;
  }

  // RETURNING id : avec le driver pg, queryRunner.query renvoie les lignes
  // retournées, donc result.length = nombre de lignes effectivement modifiées.
  const result = await queryRunner.query(
    `UPDATE public.${table}
       SET ${column} = REPLACE(${column}, $1, $2)
     WHERE ${column} LIKE $3
     RETURNING id;`,
    [LEGACY_HOST, NEW_HOST, `%${LEGACY_HOST}%`],
  );

  const affected = Array.isArray(result) ? result.length : 0;
  console.log(`  ${table}.${column} : ${affected} ligne(s) réécrite(s)`);
  return affected;
}

async function main() {
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    console.log(`Réécriture ${LEGACY_HOST} -> ${NEW_HOST}`);

    let total = 0;
    total += await rewriteColumn(queryRunner, "pokemon_set", "logo");
    total += await rewriteColumn(queryRunner, "pokemon_set", "symbol");
    total += await rewriteColumn(queryRunner, "pokemon_serie", "logo");
    total += await rewriteColumn(queryRunner, "sealed_product", "image");

    console.log(`✅ Migration terminée. ${total} champ(s) corrigé(s).`);
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error("❌ Migration échouée:", err);
  process.exit(1);
});
