import "reflect-metadata";
import { resolve } from "node:path";
import { register } from "tsconfig-paths";

// NOTE: Entity imports use src/* aliases in both TypeScript and compiled JavaScript.
register({ baseUrl: resolve(__dirname, ".."), paths: { "src/*": ["*"] } });

async function main(): Promise<void> {
  if (process.argv.slice(2).some((arg) => arg !== "--check")) {
    throw new Error(
      "Usage: seed:decks [--check]. Set SEED_DECK_OWNER_ID to select an owner.",
    );
  }
  const { AppDataSource } = await import("../data-source");
  const { seedCompetitiveDeckPresets } = await import(
    "../seed/competitive-deck-seed"
  );
  const { parseCompetitiveDeckOwnerId } = await import(
    "../seed/competitive-decks"
  );
  const ownerId = parseCompetitiveDeckOwnerId(process.env.SEED_DECK_OWNER_ID);
  await AppDataSource.initialize();
  try {
    const report = await seedCompetitiveDeckPresets(AppDataSource.manager, {
      ownerId,
      checkOnly: process.argv.includes("--check"),
    });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
