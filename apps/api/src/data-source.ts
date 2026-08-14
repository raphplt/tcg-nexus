import { config } from "dotenv";
import { DataSource } from "typeorm";

config();

const isCompiled = __filename.endsWith(".js");
const root = isCompiled ? "dist" : "src";
const ext = isCompiled ? "js" : "ts";

/**
 * Data source used by the TypeORM CLI (migrations only) — the application
 * itself is configured in `app.module.ts`.
 *
 * NOTE: exactly one `DataSource` export is allowed here, the CLI refuses the
 * file otherwise.
 */
export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [`${root}/**/*.entity.${ext}`],
  migrations: [`${root}/migrations/*.${ext}`],
  synchronize: false,
  extra: {
    max: Number(process.env.DATABASE_POOL_MAX ?? 20),
    idleTimeoutMillis: Number(
      process.env.DATABASE_POOL_IDLE_TIMEOUT_MS ?? 30_000,
    ),
    connectionTimeoutMillis: Number(
      process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS ?? 5_000,
    ),
  },
  ssl:
    process.env.NODE_ENV === "production" &&
    process.env.DATABASE_SSL !== "false"
      ? { rejectUnauthorized: false }
      : false,
});
