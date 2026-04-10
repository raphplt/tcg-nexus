import { stdin as input, stdout as output } from "node:process";
import { NestFactory } from "@nestjs/core";
import * as readline from "readline/promises";
import { DataSource } from "typeorm";
import { AppModule } from "../app.module";
import { CardEffectsSyncService } from "../card/card-effects-sync.service";
import { Currency } from "../common/enums/currency";
import { ProductKind } from "../common/enums/product-kind";
import { SealedCondition } from "../common/enums/sealed-condition";
import { Listing } from "../marketplace/entities/listing.entity";
import { SealedProduct } from "../sealed-product/entities/sealed-product.entity";
import { SealedProductService } from "../sealed-product/sealed-product.service";
import { SeedService } from "../seed/seed.service";
import { User } from "../user/entities/user.entity";

function logStep(msg: string) {
  console.log(`\x1b[36m➡️  ${msg}\x1b[0m`);
}
function logSuccess(msg: string) {
  console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
}
function logWarn(msg: string) {
  console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`);
}
function logError(msg: string) {
  console.log(`\x1b[31m❌ ${msg}\x1b[0m`);
}

async function bootstrap() {
  const rl = readline.createInterface({ input, output });

  console.log("Starting Nest application context creation...");
  const timeoutHandle = setTimeout(() => {
    console.error(
      "❌ Timeout: Application context creation took too long (> 60s). Exiting.",
    );
    process.exit(1);
  }, 60000);

  let app;
  try {
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ["error", "warn", "log", "debug", "verbose"],
    });
    clearTimeout(timeoutHandle);
    console.log("✅ Nest application context created successfully.");
  } catch (err) {
    clearTimeout(timeoutHandle);
    console.error("❌ Error creating application context:", err);
    process.exit(1);
  }

  const seedService = app.get(SeedService);
  const effectsSyncService = app.get(CardEffectsSyncService);
  const sealedProductService = app.get(SealedProductService);

  try {
    logStep("Voulez-vous détruire toutes les données existantes ? (oui/non)");

    let answer = "";
    if (process.env.SEED_AUTO_CONFIRM === "true") {
      console.log("SEED_AUTO_CONFIRM est activé. Suppression automatique.");
      answer = "oui";
    } else {
      answer = (await rl.question("> ")).trim().toLowerCase();
    }

    if (
      answer === "oui" ||
      answer === "o" ||
      answer === "y" ||
      answer === "yes"
    ) {
      logWarn("Suppression des tables...");
      await seedService.truncateTables();
      logSuccess("Tables supprimées !");
    } else {
      logWarn("Suppression ignorée, les données existantes seront conservées.");
    }

    logStep("Création des utilisateurs de test...");
    await seedService.seedUsers();
    logSuccess("Utilisateurs créés !");

    logStep("Création des CardState...");
    await seedService.seedCardStates();
    logSuccess("CardState créés !");

    logStep("Création des tournois de test...");
    await seedService.seedTournaments();
    logSuccess("Tournois créés !");

    logStep("Import des séries Pokémon...");
    await seedService.importPokemonSeries();
    logSuccess("Séries Pokémon importées !");

    logStep("Import des sets Pokémon...");
    await seedService.importPokemonSets();
    logSuccess("Sets Pokémon importés !");

    logStep("Création de la FAQ...");
    await seedService.seedFaq();
    logSuccess("FAQ créée !");

    logStep("Import des articles...");
    await seedService.seedArticles();
    logSuccess("Articles importés !");

    logStep("Import des cartes Pokémon...");
    await seedService.importPokemon();
    logSuccess("Cartes Pokémon importées !");

    logStep("Synchronisation des effets parsés (card-effects-registry)...");
    try {
      const syncResult = await effectsSyncService.syncEffectsFromRegistry();
      logSuccess(
        `Effets synchronisés : ${syncResult.updated}/${syncResult.total} cartes mises à jour`,
      );
      if (syncResult.notFound.length > 0) {
        logWarn(
          `${syncResult.notFound.length} cartes du registry absentes de la DB (normal si le registry est plus récent que le seed)`,
        );
      }
    } catch (err) {
      logWarn(
        `Sync des effets ignorée : ${(err as Error).message} — relancez 'npm run sync:effects' manuellement`,
      );
    }

    logStep("Création des listings de test...");
    await seedService.seedListings();
    logSuccess("Listings créés !");

    logStep("Création des événements de cartes...");
    await seedService.seedCardEvents();
    logSuccess("Événements de cartes créés !");

    logStep("Création des métriques de popularité...");
    await seedService.seedCardPopularityMetrics();
    logSuccess("Métriques de popularité créées !");

    logStep("Import des produits scellés...");
    try {
      const sealedReport = await sealedProductService.seedFromJson();
      logSuccess(
        `Produits scellés importés : ${sealedReport.inserted} insérés, ${sealedReport.updated} mis à jour, ${sealedReport.matchedSets} sets matchés`,
      );
      if (sealedReport.unmatchedSetNames.length > 0) {
        logWarn(
          `${sealedReport.unmatchedSetNames.length} sets non matchés : ${sealedReport.unmatchedSetNames.slice(0, 5).join(", ")}...`,
        );
      }
    } catch (err) {
      logWarn(`Seed produits scellés ignoré : ${(err as Error).message}`);
    }

    logStep("Création des listings de produits scellés...");
    try {
      const ds = app.get(DataSource);
      const sealedProducts = await ds
        .getRepository(SealedProduct)
        .find({ take: 200 });
      const sellers = await ds.getRepository(User).find();
      if (sealedProducts.length > 0 && sellers.length > 0) {
        const currencies = [Currency.EUR, Currency.USD, Currency.GBP];
        const conditions = [
          SealedCondition.SEALED,
          SealedCondition.SEALED,
          SealedCondition.SEALED,
          SealedCondition.BOX_DAMAGED,
        ];
        const listingRepo = ds.getRepository(Listing);
        const listings: Listing[] = [];
        for (const product of sealedProducts) {
          const count = Math.floor(Math.random() * 4);
          for (let i = 0; i < count; i++) {
            const seller = sellers[Math.floor(Math.random() * sellers.length)];
            const price = Math.round((Math.random() * 150 + 5) * 100) / 100;
            listings.push(
              listingRepo.create({
                productKind: ProductKind.SEALED,
                seller,
                sealedProduct: product,
                price,
                currency:
                  currencies[Math.floor(Math.random() * currencies.length)],
                quantityAvailable: Math.floor(Math.random() * 3) + 1,
                sealedCondition:
                  conditions[Math.floor(Math.random() * conditions.length)],
              }),
            );
          }
        }
        const batchSize = 500;
        for (let i = 0; i < listings.length; i += batchSize) {
          await listingRepo.save(listings.slice(i, i + batchSize));
        }
        logSuccess(
          `${listings.length} listings scellés créés pour ${sealedProducts.length} produits`,
        );
      } else {
        logWarn("Pas de produits scellés ou de vendeurs pour les listings");
      }
    } catch (err) {
      logWarn(`Listings scellés ignorés : ${(err as Error).message}`);
    }

    logStep("Création des decks de test...");
    await seedService.seedDecks();
    logSuccess("Decks créés !");

    logStep("Création des decks compétitifs (IA / templates)...");
    await seedService.seedCompetitiveDecks();
    logSuccess("Decks compétitifs créés !");

    logStep("Création d'un tournoi complet avec seeding...");
    const completeTournament = await seedService.seedCompleteTournament(
      "Tournoi de Démonstration avec Seeding",
      8,
    );
    logSuccess(
      `Tournoi complet créé: ${completeTournament.name} (ID: ${completeTournament.id})`,
    );

    logSuccess("🎉 Seed terminé avec succès !");
  } catch (error) {
    logError("Erreur lors du seed : " + error);
  } finally {
    await app.close();
    rl.close();
  }
}

bootstrap().catch((error) => {
  logError("Bootstrap error: " + error);
  process.exit(1);
});
