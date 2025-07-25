import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from '../seed/seed.service';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'node:process';

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
  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(SeedService);

  try {
    logStep('Voulez-vous détruire toutes les données existantes ? (oui/non)');
    const answer = (await rl.question('> ')).trim().toLowerCase();
    if (
      answer === 'oui' ||
      answer === 'o' ||
      answer === 'y' ||
      answer === 'yes'
    ) {
      logWarn('Suppression des tables...');
      await seedService.truncateTables();
      logSuccess('Tables supprimées !');
    } else {
      logWarn('Suppression ignorée, les données existantes seront conservées.');
    }

    logStep('Création des utilisateurs de test...');
    await seedService.seedUsers();
    logSuccess('Utilisateurs créés !');

    logStep('Création des tournois de test...');
    await seedService.seedTournaments();
    logSuccess('Tournois créés !');

    logStep('Import des séries Pokémon...');
    await seedService.importPokemonSeries();
    logSuccess('Séries Pokémon importées !');

    logStep('Import des sets Pokémon...');
    await seedService.importPokemonSets();
    logSuccess('Sets Pokémon importés !');

    logStep('Import des articles...');
    await seedService.seedArticles();
    logSuccess('Articles importés !');

    logStep('Import des cartes Pokémon...');
    await seedService.importPokemon();
    logSuccess('Cartes Pokémon importées !');

    logStep('Création des listings de test...');
    await seedService.seedListings();
    logSuccess('Listings créés !');

    logSuccess('🎉 Seed terminé avec succès !');
  } catch (error) {
    logError('Erreur lors du seed : ' + error);
  } finally {
    await app.close();
    rl.close();
  }
}

bootstrap().catch((error) => logError('Bootstrap error: ' + error));
