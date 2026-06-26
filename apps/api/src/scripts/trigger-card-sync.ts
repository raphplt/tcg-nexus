import { NestFactory } from "@nestjs/core";
import { AppModule } from "src/app.module";
import { CardSyncService } from "src/pokemon-card/card-sync.service";

async function main() {
  console.log("⚡ Starting manual card sync from TCGdex...");
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "error", "warn"],
  });

  const syncService = app.get(CardSyncService);

  try {
    const stats = await syncService.syncAll();
    console.log(`\n✅ Sync complete!`);
    console.log(`   Séries insérées: ${stats.seriesInserted}`);
    console.log(`   Sets insérés: ${stats.setsInserted}`);
    console.log(`   Cartes synchronisées: ${stats.cardsSynced}`);
  } catch (err) {
    console.error("\n❌ Sync failed:", (err as Error).message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

void main();
