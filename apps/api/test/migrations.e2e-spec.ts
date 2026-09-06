import path from "path";
import { DataSource } from "typeorm";
import { MarketplaceCheckout1785974400000 } from "../src/migrations/1785974400000-MarketplaceCheckout";
import { ShippingFees1785978000000 } from "../src/migrations/1785978000000-ShippingFees";
import { PlatformShippingRates1785981600000 } from "../src/migrations/1785981600000-PlatformShippingRates";
import { Translations1786060800000 } from "../src/migrations/1786060800000-Translations";
import { UserPreferredLocale1786064400000 } from "../src/migrations/1786064400000-UserPreferredLocale";
import { NotificationTranslations1786068000000 } from "../src/migrations/1786068000000-NotificationTranslations";
import { CatalogTranslations1786071600000 } from "../src/migrations/1786071600000-CatalogTranslations";
import { DropLegacyCatalogColumns1786075200000 } from "../src/migrations/1786075200000-DropLegacyCatalogColumns";
import { SealedProductTranslations1786078800000 } from "../src/migrations/1786078800000-SealedProductTranslations";
import { ArticlePublishing1786082400000 } from "../src/migrations/1786082400000-ArticlePublishing";
import { OnlinePlaySessions1786086000000 } from "../src/migrations/1786086000000-OnlinePlaySessions";
import { PerformanceIndexes1786089600000 } from "../src/migrations/1786089600000-PerformanceIndexes";
import { SwissTournaments1786093200000 } from "../src/migrations/1786093200000-SwissTournaments";
import { DoubleElimination1786096800000 } from "../src/migrations/1786096800000-DoubleElimination";
import { ArticleSlugIntegrity1786097000000 } from "../src/migrations/1786097000000-ArticleSlugIntegrity";
import { AuthIdentities1786098000000 } from "../src/migrations/1786098000000-AuthIdentities";
import { CheckoutAttemptAndAuditOutbox1786099000000 } from "../src/migrations/1786099000000-CheckoutAttemptAndAuditOutbox";
import { RefundsReturnsClaims1786100000000 } from "../src/migrations/1786100000000-RefundsReturnsClaims";
import { CollectionInventoryAndListings1786101000000 } from "../src/migrations/1786101000000-CollectionInventoryAndListings";
import { TournamentOperations1786102000000 } from "../src/migrations/1786102000000-TournamentOperations";
import { SellerSettlementAndTrust1786200000000 } from "../src/migrations/1786200000000-SellerSettlementAndTrust";

jest.setTimeout(60000);

describe("Migration Discipline & Baseline Adoption (e2e)", () => {
  let dataSource: DataSource;

  const MIGRATIONS = [
    MarketplaceCheckout1785974400000,
    ShippingFees1785978000000,
    PlatformShippingRates1785981600000,
    Translations1786060800000,
    UserPreferredLocale1786064400000,
    NotificationTranslations1786068000000,
    CatalogTranslations1786071600000,
    DropLegacyCatalogColumns1786075200000,
    SealedProductTranslations1786078800000,
    ArticlePublishing1786082400000,
    OnlinePlaySessions1786086000000,
    PerformanceIndexes1786089600000,
    SwissTournaments1786093200000,
    DoubleElimination1786096800000,
    ArticleSlugIntegrity1786097000000,
    AuthIdentities1786098000000,
    CheckoutAttemptAndAuditOutbox1786099000000,
    RefundsReturnsClaims1786100000000,
    CollectionInventoryAndListings1786101000000,
    TournamentOperations1786102000000,
    SellerSettlementAndTrust1786200000000,
  ];

  const PROBES = [
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
  ];

  beforeAll(async () => {
    dataSource = new DataSource({
      type: "postgres",
      host: process.env.DATABASE_HOST || "127.0.0.1",
      port: parseInt(process.env.DATABASE_PORT || "55432", 10),
      username: process.env.DATABASE_USER || "postgres",
      password: process.env.DATABASE_PASSWORD || "postgres",
      database: process.env.DATABASE_NAME || "tcg_nexus_test",
      synchronize: true, // Step 1: establish the entity schema representing synchronized dev/staging DB
      migrationsRun: false,
      entities: [path.join(__dirname, "../src/**/*.entity.ts")],
      migrations: MIGRATIONS,
    });

    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it("should have exactly 21 defined migration classes in sequential timestamp order", () => {
    expect(MIGRATIONS).toHaveLength(21);

    const instances = MIGRATIONS.map((M) => new M());
    for (let i = 1; i < instances.length; i++) {
      const prevName = instances[i - 1].name;
      const currName = instances[i].name;

      const prevTs = parseInt(prevName.replace(/\D/g, ""), 10);
      const currTs = parseInt(currName.replace(/\D/g, ""), 10);

      expect(currTs).toBeGreaterThanOrEqual(prevTs);
    }
  });

  it("should adopt synchronized database using baseline probes into migrations table", async () => {
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "migrations" (
        "id" SERIAL PRIMARY KEY,
        "timestamp" bigint NOT NULL,
        "name" character varying NOT NULL
      )
    `);

    let stamped = 0;
    for (const probe of PROBES) {
      const rows = await dataSource.query(probe.probe);
      if (rows.length > 0) {
        const existing = await dataSource.query(
          `SELECT 1 FROM migrations WHERE name = $1`,
          [probe.name],
        );
        if (existing.length === 0) {
          await dataSource.query(
            `INSERT INTO migrations ("timestamp", "name") VALUES ($1, $2)`,
            [probe.timestamp, probe.name],
          );
          stamped++;
        }
      }
    }

    expect(stamped).toBe(21);

    const recorded = await dataSource.query(`SELECT name FROM migrations ORDER BY timestamp ASC`);
    expect(recorded.length).toBe(21);
  });

  it("should verify target schema entities and columns exist with synchronize: false", async () => {
    // 1. Seller settlement tables (MKT-06 / Milestone 5)
    const settlementTables = await dataSource.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name IN ('seller_settlement_account', 'seller_allocation', 'seller_payout', 'seller_review')
    `);
    expect(settlementTables).toHaveLength(4);

    // 2. Tournament operations tables (TRN-01 - TRN-05 / Milestone 4)
    const tournamentTables = await dataSource.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name IN ('match_result_proposal', 'tournament_deck_snapshot')
    `);
    expect(tournamentTables).toHaveLength(2);

    // 3. Collection inventory availability columns (COL-02 / Milestone 3)
    const collectionColumns = await dataSource.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'collection_item'
        AND column_name IN ('quantityAvailable', 'quantityReserved', 'quantitySold')
    `);
    expect(collectionColumns).toHaveLength(3);

    // 4. Refunds & claims tables (MKT-02, MKT-04 / Milestone 2)
    const refundTables = await dataSource.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name IN ('refund_operation', 'refund_line', 'return_item')
    `);
    expect(refundTables).toHaveLength(3);

    // 5. Audit & outbox tables (FND-02, FND-03 / Milestone 1)
    const auditOutboxTables = await dataSource.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name IN ('audit_event', 'outbox_event')
    `);
    expect(auditOutboxTables).toHaveLength(2);
  });

  it("should be idempotent when running migrations again with zero pending migrations", async () => {
    const hasPending = await dataSource.showMigrations();
    expect(hasPending).toBe(false);

    // Re-running runMigrations should be a no-op
    const secondRun = await dataSource.runMigrations();
    expect(secondRun).toHaveLength(0);
  });

  it("should support reverting and re-applying the latest migration cleanly", async () => {
    // 1. Undo the last migration (SellerSettlementAndTrust1786200000000)
    await dataSource.undoLastMigration();

    // Verify seller settlement account table dropped
    const tablesAfterRevert = await dataSource.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'seller_settlement_account'
    `);
    expect(tablesAfterRevert).toHaveLength(0);

    // Verify showMigrations now detects pending migration
    const hasPending = await dataSource.showMigrations();
    expect(hasPending).toBe(true);

    // 2. Re-apply migrations
    const reapply = await dataSource.runMigrations();
    expect(reapply.length).toBeGreaterThanOrEqual(1);
    expect(reapply[0].name).toBe("SellerSettlementAndTrust1786200000000");

    // Verify table restored
    const tablesAfterReapply = await dataSource.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'seller_settlement_account'
    `);
    expect(tablesAfterReapply).toHaveLength(1);
  });
});
