/**
 * Importe le catalogue Pokémon (séries, sets, cartes et traductions) depuis le
 * dataset local, sans rejouer le seed de démonstration.
 *
 *   npm run import:catalog                # toutes les langues du dataset
 *   LOCALES=en npm run import:catalog     # une seule langue
 *
 * Le dataset se récupère avec `npm run data:pull` dans apps/fetch.
 */
import { NestFactory } from "@nestjs/core";
import { isDatasetLocale, type DatasetLocale } from "@repo/pokemon-dataset";
import { AppModule } from "../app.module";
import { CatalogImportService } from "../seed/catalog-import.service";

function requestedLocales(): DatasetLocale[] | undefined {
  const raw = process.env.LOCALES;
  if (!raw) return undefined;

  return raw
    .split(",")
    .map((locale) => locale.trim().toLowerCase())
    .filter(isDatasetLocale);
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    const report = await app
      .get(CatalogImportService)
      .importCatalog(requestedLocales());

    console.log("\nImport terminé :");
    console.log(`  langues     : ${report.locales.join(", ")}`);
    console.log(`  séries      : ${report.series}`);
    console.log(`  sets        : ${report.sets}`);
    console.log(
      `  cartes      : ${report.cardsCreated} créées, ${report.cardsUpdated} mises à jour`,
    );
    for (const [locale, count] of Object.entries(report.translations)) {
      console.log(`  traductions ${locale} : ${count}`);
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
