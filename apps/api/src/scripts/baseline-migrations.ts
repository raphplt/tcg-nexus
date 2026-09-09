/**
 * Adopts a database built by TypeORM `synchronize` into the migration history.
 *
 * Development databases were originally created by `synchronize`, never by migrations,
 * so their `migrations` table is empty while their schema already reflects most of
 * the history. Running `migration:run` there would replay everything and fail
 * on the first `CREATE TABLE` of a table that already exists.
 *
 * This script marks as applied every migration whose effect is already present,
 * detected by probing the schema rather than by trusting a hardcoded list. The
 * remaining unapplied migrations can then be executed normally by `npm run migration:run`.
 *
 * Idempotent: a migration already recorded is left alone. Safe on a fresh
 * database too — nothing is detected, so nothing is stamped.
 *
 * Usage: npm run migration:baseline
 */
import { AppDataSource } from "../data-source";

/**
 * A migration and the SQL probe determining whether its schema effect is present.
 * The probe returns at least one row when the migration's changes already exist.
 */
interface MigrationProbe {
  name: string;
  timestamp: number;
  probe: string;
}

const PROBES: MigrationProbe[] = [
  {
    name: "InitialSchema1785000000000",
    timestamp: 1785000000000,
    probe: `SELECT 1 FROM information_schema.tables WHERE table_name = 'user'`,
  },
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
  {
    name: "SealedProductTranslations1786078800000",
    timestamp: 1786078800000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'sealed_product_locale'`,
  },
  {
    name: "ArticlePublishing1786082400000",
    timestamp: 1786082400000,
    probe: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'article' AND column_name = 'slug'`,
  },
  {
    name: "OnlinePlaySessions1786086000000",
    timestamp: 1786086000000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'online_match_session'`,
  },
  {
    name: "PerformanceIndexes1786089600000",
    timestamp: 1786089600000,
    probe: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'ranked_match_history' AND column_name = 'matchId'`,
  },
  {
    name: "SwissTournaments1786093200000",
    timestamp: 1786093200000,
    probe: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'match' AND column_name = 'isBye'`,
  },
  {
    name: "DoubleElimination1786096800000",
    timestamp: 1786096800000,
    probe: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'match' AND column_name = 'bracketSide'`,
  },
  {
    name: "ArticleSlugIntegrity1786097000000",
    timestamp: 1786097000000,
    probe: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'article' AND column_name = 'slug' AND is_nullable = 'NO'`,
  },
  {
    name: "AuthIdentities1786098000000",
    timestamp: 1786098000000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'auth_identity'`,
  },
  {
    name: "CheckoutAttemptAndAuditOutbox1786099000000",
    timestamp: 1786099000000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'outbox_event'`,
  },
  {
    name: "RefundsReturnsClaims1786100000000",
    timestamp: 1786100000000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'refund_operation'`,
  },
  {
    name: "CollectionInventoryAndListings1786101000000",
    timestamp: 1786101000000,
    probe: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'collection_item' AND column_name = 'quantityAvailable'`,
  },
  {
    name: "TournamentOperations1786102000000",
    timestamp: 1786102000000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'tournament_deck_snapshot'`,
  },
  {
    name: "SellerSettlementAndTrust1786200000000",
    timestamp: 1786200000000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'seller_settlement_account'`,
  },
  {
    name: "RefundReservations1788768000000",
    timestamp: 1788768000000,
    probe: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'refund_operation' AND column_name = 'requestKey'`,
  },
  {
    name: "SellerLedgerAndPayoutExecution1788800000000",
    timestamp: 1788800000000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'seller_ledger_entry'`,
  },
  {
    name: "InventoryMovementsAndListingReservations1788900000000",
    timestamp: 1788900000000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'inventory_movement'`,
  },
  {
    name: "ReceiptImports1789000000000",
    timestamp: 1789000000000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'receipt_import'`,
  },
  {
    name: "CollectionBulkOperations1789100000000",
    timestamp: 1789100000000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'collection_bulk_operation'`,
  },
  {
    name: "CheckoutRecoveryAndCompensation1789200000000",
    timestamp: 1789200000000,
    probe: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'payment_transaction'
              AND column_name = 'compensationRequiredAt'`,
  },
  {
    name: "ProcessedEvents1789300000000",
    timestamp: 1789300000000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'processed_event'`,
  },
  {
    name: "DeckLegalityAndCorrections1789400000000",
    timestamp: 1789400000000,
    probe: `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'tournament_deck_snapshot_revision'`,
  },
  {
    name: "RepairLegacyColumnNames1789500000000",
    // A database built by synchronization already carries the column names the
    // entities read, so the repair has nothing to do on it.
    timestamp: 1789500000000,
    probe: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'collection_item'
              AND column_name = 'quantityAvailable'`,
  },
];

/**
 * Main execution function probing the schema and stamping existing migrations.
 */
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
      console.log(`= ${migration.name} — already recorded`);
      continue;
    }

    const rows = await AppDataSource.query(migration.probe);
    if (rows.length === 0) {
      console.log(
        `- ${migration.name} — not detected, will be executed by runner`,
      );
      continue;
    }

    await AppDataSource.query(
      `INSERT INTO migrations ("timestamp", "name") VALUES ($1, $2)`,
      [migration.timestamp, migration.name],
    );
    console.log(`+ ${migration.name} — stamped as applied`);
    stamped++;
  }

  console.log(`\n${stamped} migration(s) stamped. Next step:`);
  console.log("  npm run migration:run");

  await AppDataSource.destroy();
}

main().catch((error: Error) => {
  console.error("Migration baseline failed:", error.message);
  process.exit(1);
});
