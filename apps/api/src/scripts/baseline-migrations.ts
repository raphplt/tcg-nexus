/**
 * Adopts a database built by TypeORM `synchronize` into the migration history.
 *
 * Development databases were created by `synchronize`, never by migrations, so
 * their `migrations` table is empty while their schema already reflects most of
 * the history. Running `migration:run` there would replay everything and fail
 * on the first `CREATE TABLE` of a table that already exists.
 *
 * This script marks as applied every migration whose effect is already present,
 * detected by probing the schema rather than by trusting a hardcoded list. The
 * remaining migrations are then run normally by `npm run migration:run`.
 *
 * Idempotent: a migration already recorded is left alone. Safe on a fresh
 * database too — nothing is detected, so nothing is stamped.
 *
 * Usage: npm run migration:baseline
 */
import { AppDataSource } from "../data-source";

/**
 * A migration and the SQL probe telling whether its effect is already in the
 * schema. The probe must return at least one row when the migration is done.
 */
interface MigrationProbe {
  name: string;
  timestamp: number;
  probe: string;
}

const PROBES: MigrationProbe[] = [
  {
    name: "MarketplaceCheckout1785974400000",
    timestamp: 1785974400000,
    probe: `SELECT 1 FROM information_schema.tables WHERE table_name = 'order_item'`,
  },
  {
    name: "ShippingFees1785978000000",
    timestamp: 1785978000000,
    probe: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'order' AND column_name ILIKE '%shipping%'`,
  },
  {
    // Pure data migration: no schema trace to probe. Replaying it only resets
    // shipping costs to the platform rates, which is its whole purpose, so it
    // is stamped as soon as the column it writes exists.
    name: "PlatformShippingRates1785981600000",
    timestamp: 1785981600000,
    probe: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'listing' AND column_name = 'handlingTimeDays'`,
  },
  {
    name: "Translations1786060800000",
    timestamp: 1786060800000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name ILIKE '%translation%'`,
  },
  {
    name: "UserPreferredLocale1786064400000",
    timestamp: 1786064400000,
    probe: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user' AND column_name ILIKE '%referredlocale%'`,
  },
  {
    name: "NotificationTranslations1786068000000",
    timestamp: 1786068000000,
    probe: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notification'
              AND column_name = 'translationKey'`,
  },
  {
    name: "CatalogTranslations1786071600000",
    timestamp: 1786071600000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'card_translation'`,
  },
  {
    name: "DropLegacyCatalogColumns1786075200000",
    timestamp: 1786075200000,
    probe: `SELECT 1 WHERE NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'card' AND column_name = 'name')`,
  },
];

async function main() {
  await AppDataSource.initialize();

  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS "migrations" (
      "id" SERIAL PRIMARY KEY,
      "timestamp" bigint NOT NULL,
      "name" character varying NOT NULL
    )
  `);

  const recorded = new Set<string>(
    (await AppDataSource.query(`SELECT name FROM migrations`)).map(
      (row: { name: string }) => row.name,
    ),
  );

  let stamped = 0;
  for (const migration of PROBES) {
    if (recorded.has(migration.name)) {
      console.log(`= ${migration.name} — déjà enregistrée`);
      continue;
    }

    const rows = await AppDataSource.query(migration.probe);
    if (rows.length === 0) {
      console.log(`- ${migration.name} — non appliquée, sera jouée`);
      continue;
    }

    await AppDataSource.query(
      `INSERT INTO migrations ("timestamp", "name") VALUES ($1, $2)`,
      [migration.timestamp, migration.name],
    );
    console.log(`+ ${migration.name} — marquée comme appliquée`);
    stamped++;
  }

  // Created by CatalogTranslations, which `synchronize` could not reproduce:
  // it is a partial index, outside the entity metadata.
  await AppDataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "UQ_card_game_tcgDexId"
    ON "card" ("game", "tcgDexId")
    WHERE "tcgDexId" IS NOT NULL
  `);

  console.log(`\n${stamped} migration(s) marquée(s). Lance maintenant :`);
  console.log("  npm run migration:run");

  await AppDataSource.destroy();
}

main().catch((error: Error) => {
  console.error("Échec du baseline :", error.message);
  process.exit(1);
});
