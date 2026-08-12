/**
 * Synchronizes parsed card definitions (card-effects-registry.json) into PostgreSQL database.
 *
 * Usage:
 *   npm run sync:effects              -- uses default registry path
 *   npm run sync:effects -- --registry /path/to/registry.json
 *
 * Prerequisites:
 *   - Database connection available (DATABASE_* environment variables)
 *   - card-effects-registry.json exists in packages/effect-parser/
 */
import { NestFactory } from "@nestjs/core";
import { AppModule } from "src/app.module";
import { CardEffectsSyncService } from "src/card/card-effects-sync.service";

async function main() {
  // Resolve optional --registry CLI flag argument
  const registryFlagIdx = process.argv.indexOf("--registry");
  const customRegistry =
    registryFlagIdx !== -1 ? process.argv[registryFlagIdx + 1] : undefined;

  console.log("⚡ Syncing card effects to database...");
  if (customRegistry) {
    console.log(`   Registry: ${customRegistry}`);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });

  const syncService = app.get(CardEffectsSyncService);

  try {
    const result = await syncService.syncEffectsFromRegistry(customRegistry);

    console.log(`\n✅ Sync complete`);
    console.log(`   Registry entries : ${result.total}`);
    console.log(`   Updated in DB    : ${result.updated}`);

    if (result.notFound.length > 0) {
      console.warn(
        `\n⚠️  ${result.notFound.length} tcgDexIds not found in DB (not seeded yet?)`,
      );
      if (result.notFound.length <= 10) {
        result.notFound.forEach((id) => console.warn(`     - ${id}`));
      } else {
        result.notFound
          .slice(0, 10)
          .forEach((id) => console.warn(`     - ${id}`));
        console.warn(`     ... and ${result.notFound.length - 10} more`);
      }
    }
  } catch (err) {
    console.error("\n❌ Sync failed:", (err as Error).message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

void main();
