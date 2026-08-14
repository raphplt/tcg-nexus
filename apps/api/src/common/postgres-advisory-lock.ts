import { DataSource } from "typeorm";

/**
 * Runs a task once across all API replicas by holding a PostgreSQL advisory lock.
 *
 * @param dataSource Application data source, when available.
 * @param lockName Stable task identifier shared by every replica.
 * @param task Work to execute while the lock is held.
 * @returns The task result, or undefined when another replica owns the lock.
 */
export async function runWithPostgresAdvisoryLock<T>(
  dataSource: DataSource | undefined,
  lockName: string,
  task: () => Promise<T>,
): Promise<T | undefined> {
  if (
    !dataSource ||
    !dataSource.options ||
    dataSource.options.type !== "postgres"
  ) {
    return task();
  }

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  try {
    const rows = (await queryRunner.query(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
      [lockName],
    )) as Array<{ acquired: boolean }>;
    if (!rows[0]?.acquired) return undefined;

    try {
      return await task();
    } finally {
      await queryRunner.query("SELECT pg_advisory_unlock(hashtext($1))", [
        lockName,
      ]);
    }
  } finally {
    await queryRunner.release();
  }
}
