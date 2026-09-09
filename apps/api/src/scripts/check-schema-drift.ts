import { AppDataSource } from "../data-source";

/**
 * Reports the schema changes the entities would still require (FND-04).
 *
 * A database built by the migration chain must need none: any query printed
 * here is a difference between what the migrations create and what the
 * application reads.
 */
async function main(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const log = await AppDataSource.driver.createSchemaBuilder().log();
    console.log(`Pending schema changes: ${log.upQueries.length}`);
    for (const query of log.upQueries) {
      console.log(` - ${query.query}`);
    }
    if (log.upQueries.length > 0) process.exitCode = 1;
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error: Error) => {
  console.error("Schema drift check failed:", error.message);
  process.exit(1);
});
