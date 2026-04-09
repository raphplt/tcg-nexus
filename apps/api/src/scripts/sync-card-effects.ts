/**
 * Synchronise les effets parsés (card-effects-registry.json) vers la base de
 * données PostgreSQL.
 *
 * Usage :
 *   npm run sync:effects              -- utilise le registry par défaut
 *   npm run sync:effects -- --registry /chemin/vers/registry.json
 *
 * Pré-requis :
 *   - La base de données doit être accessible (variables DATABASE_*)
 *   - card-effects-registry.json doit exister dans packages/effect-parser/
 *     (généré par `npm run parse` dans ce même dossier)
 */
import { NestFactory } from "@nestjs/core";
import { AppModule } from "src/app.module";
import { CardEffectsSyncService } from "src/card/card-effects-sync.service";

async function main() {
  // Résoudre un éventuel --registry argument
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
