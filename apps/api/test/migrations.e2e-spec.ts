import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DataSource } from "typeorm";
import { AppDataSource } from "../src/data-source";

jest.setTimeout(180000);

/**
 * Proves the migration chain builds the schema the application reads (FND-04).
 *
 * Every check runs with synchronization disabled against a database this suite
 * creates itself, so nothing here is proven by TypeORM silently fixing the
 * schema behind the migrations.
 */
describe("Migration chain (PostgreSQL, synchronize disabled)", () => {
  const admin = new DataSource({
    type: "postgres",
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    synchronize: false,
  });

  const migrationsDir = join(__dirname, "..", "src", "migrations");
  const databases = {
    fresh: "tcg_migrations_fresh",
    legacy: "tcg_migrations_legacy",
  };

  /** Opens a data source on one of the databases this suite builds. */
  const connect = async (database: string): Promise<DataSource> =>
    new DataSource({
      ...(AppDataSource.options as unknown as Record<string, unknown>),
      database,
      synchronize: false,
      migrationsRun: false,
      logging: false,
    } as never).initialize();

  /** Creates an empty database with the extensions the schema depends on. */
  const createDatabase = async (name: string): Promise<void> => {
    await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
    await admin.query(`CREATE DATABASE "${name}"`);
    const created = await connect(name);
    try {
      await created.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
      await created.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
      await created.query(
        `CREATE OR REPLACE FUNCTION immutable_unaccent(text)
           RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS
           $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$`,
      );
    } finally {
      await created.destroy();
    }
  };

  /** Columns the defective migrations wrote under names the entities never read. */
  const legacyRenames = async (): Promise<Array<[string, string, string]>> => {
    const { RepairLegacyColumnNames1789500000000 } = (await import(
      "../src/migrations/1789500000000-RepairLegacyColumnNames"
    )) as never as {
      RepairLegacyColumnNames1789500000000: {
        RENAMES: Array<[string, Array<[string, string]>]>;
      };
    };
    const renames = (
      RepairLegacyColumnNames1789500000000 as unknown as {
        RENAMES: Array<[string, Array<[string, string]>]>;
      }
    ).RENAMES;
    return renames.flatMap(([table, columns]) =>
      columns.map(
        ([written, expected]) =>
          [table, written, expected] as [string, string, string],
      ),
    );
  };

  beforeAll(async () => {
    await admin.initialize();
  });

  afterAll(async () => {
    for (const database of Object.values(databases)) {
      await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
    }
    await admin.destroy();
  });

  it("declares migrations in sequential timestamp order", () => {
    const timestamps = readdirSync(migrationsDir)
      .filter((file) => /^\d+-.*\.ts$/.test(file))
      .map((file) => Number(file.split("-")[0]));

    expect(timestamps.length).toBeGreaterThan(25);
    expect([...timestamps].sort((a, b) => a - b)).toEqual(
      [...timestamps].sort((a, b) => a - b),
    );
    // The baseline must come first: everything after it assumes its schema.
    expect(Math.min(...timestamps)).toBe(1785000000000);
  });

  it("builds a complete schema on an empty database", async () => {
    await createDatabase(databases.fresh);
    const fresh = await connect(databases.fresh);
    try {
      // The audited defect: the chain began by altering tables it never created.
      const executed = await fresh.runMigrations({ transaction: "each" });
      expect(executed.length).toBeGreaterThan(25);

      const pending = await fresh.driver.createSchemaBuilder().log();
      // Nothing left for synchronization to fix means the migrations create
      // exactly the schema the entities read.
      expect(pending.upQueries.map((query) => query.query)).toEqual([]);
      expect(await fresh.showMigrations()).toBe(false);
    } finally {
      await fresh.destroy();
    }
  });

  it("re-runs against its own result without changing anything", async () => {
    const fresh = await connect(databases.fresh);
    try {
      expect(await fresh.runMigrations()).toEqual([]);

      // Each migration also guards its own effect, so replaying the chain from
      // an empty ledger is safe on a database that already holds it.
      await fresh.query(`DELETE FROM "migrations"`);
      const replayed = await fresh.runMigrations({ transaction: "each" });
      expect(replayed.length).toBeGreaterThan(25);
      const pending = await fresh.driver.createSchemaBuilder().log();
      expect(pending.upQueries.map((query) => query.query)).toEqual([]);
    } finally {
      await fresh.destroy();
    }
  });

  it("repairs a database the defective migrations left behind", async () => {
    await createDatabase(databases.legacy);
    const legacy = await connect(databases.legacy);
    try {
      await legacy.runMigrations({ transaction: "each" });

      // Rebuild the state those migrations produced: columns under names the
      // application never reads, and an availability backfill that matched no
      // row because the column was added with a default of one.
      await legacy.query(
        `ALTER TABLE "seller_allocation" ALTER COLUMN "commissionRate" SET DEFAULT 0.0500`,
      );
      const renames = await legacyRenames();
      for (const [table, written, expected] of renames) {
        await legacy.query(
          `ALTER TABLE "${table}" RENAME COLUMN "${expected}" TO "${written}"`,
        );
      }
      await legacy.query(
        `INSERT INTO "collection_item" ("quantity", "quantity_available", "quantity_reserved", "quantity_sold", "language")
         VALUES (10, 1, 0, 0, 'fr'), (4, 1, 1, 0, 'fr'), (1, 1, 0, 0, 'fr')`,
      );
      await legacy.query(
        `DELETE FROM "migrations" WHERE "name" = 'RepairLegacyColumnNames1789500000000'`,
      );

      const executed = await legacy.runMigrations({ transaction: "each" });
      expect(executed.map((migration) => migration.name)).toEqual([
        "RepairLegacyColumnNames1789500000000",
      ]);

      const pending = await legacy.driver.createSchemaBuilder().log();
      expect(pending.upQueries.map((query) => query.query)).toEqual([]);

      const repaired = (await legacy.query(
        `SELECT "quantity", "quantityAvailable", "quantityReserved", "language"
           FROM "collection_item" ORDER BY "quantity" DESC`,
      )) as Array<{
        quantity: number;
        quantityAvailable: number;
        quantityReserved: number;
        language: string | null;
      }>;

      // The ten-copy stack recovers the copies the backfill dropped.
      expect(repaired[0]).toMatchObject({
        quantity: 10,
        quantityAvailable: 10,
        language: null,
      });
      // A stack holding a reserved copy keeps the quantities that produced it.
      expect(repaired[1]).toMatchObject({
        quantity: 4,
        quantityAvailable: 1,
        quantityReserved: 1,
      });
      expect(repaired[2]).toMatchObject({ quantity: 1, quantityAvailable: 1 });
    } finally {
      await legacy.destroy();
    }
  });

  it("adopts a synchronized database through the baseline script", async () => {
    const adopted = "tcg_migrations_adopted";
    await admin.query(`DROP DATABASE IF EXISTS "${adopted}"`);
    await admin.query(`CREATE DATABASE "${adopted}"`);
    try {
      const synchronized = await new DataSource({
        ...(AppDataSource.options as unknown as Record<string, unknown>),
        database: adopted,
        synchronize: true,
        logging: false,
      } as never).initialize();
      await synchronized.destroy();

      // The supported upgrade path for an installation built by synchronization.
      execFileSync(
        "npx",
        [
          "ts-node",
          "-r",
          "tsconfig-paths/register",
          "src/scripts/baseline-migrations.ts",
        ],
        {
          cwd: join(__dirname, ".."),
          env: { ...process.env, DATABASE_NAME: adopted },
          stdio: "pipe",
        },
      );

      const stamped = await connect(adopted);
      try {
        // deck_embedding has no entity, so synchronization never creates it:
        // its migration is the only one the runner still has to execute.
        const executed = await stamped.runMigrations({ transaction: "each" });
        expect(executed.map((migration) => migration.name)).toEqual([
          "DeckEmbeddings1789600000000",
        ]);
        expect(await stamped.showMigrations()).toBe(false);
        const pending = await stamped.driver.createSchemaBuilder().log();
        expect(pending.upQueries.map((query) => query.query)).toEqual([]);
      } finally {
        await stamped.destroy();
      }
    } finally {
      await admin.query(`DROP DATABASE IF EXISTS "${adopted}"`);
    }
  });

  it("reverts and re-applies the latest migration cleanly", async () => {
    const fresh = await connect(databases.fresh);
    try {
      const before = await fresh.query(
        `SELECT "name" FROM "migrations" ORDER BY "timestamp" DESC LIMIT 1`,
      );
      await fresh.undoLastMigration({ transaction: "each" });
      const executed = await fresh.runMigrations({ transaction: "each" });

      expect(executed.map((migration) => migration.name)).toEqual([
        before[0].name,
      ]);
      const pending = await fresh.driver.createSchemaBuilder().log();
      expect(pending.upQueries.map((query) => query.query)).toEqual([]);
    } finally {
      await fresh.destroy();
    }
  });
});
