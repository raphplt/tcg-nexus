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

    let answer = '';
    if (process.env.SEED_AUTO_CONFIRM === 'true') {
      console.log('SEED_AUTO_CONFIRM est activé. Suppression automatique.');
      answer = 'oui';
    } else {
      answer = (await rl.question('> ')).trim().toLowerCase();
    }

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

    logStep('Création des CardState...');
    await seedService.seedCardStates();
    logSuccess('CardState créés !');

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

    logStep('Création des événements de cartes...');
    await seedService.seedCardEvents();
    logSuccess('Événements de cartes créés !');

    logStep('Création des métriques de popularité...');
    await seedService.seedCardPopularityMetrics();
    logSuccess('Métriques de popularité créées !');

    logStep('Création des decks de test...');
    await seedService.seedDecks();
    logSuccess('Decks créés !');

    logStep("Création d'un tournoi complet avec seeding...");
    const completeTournament = await seedService.seedCompleteTournament(
      'Tournoi de Démonstration avec Seeding',
      8
    );
    logSuccess(
      `Tournoi complet créé: ${completeTournament.name} (ID: ${completeTournament.id})`
    );

    logSuccess('🎉 Seed terminé avec succès !');
  } catch (error) {
    logError('Erreur lors du seed : ' + error);
  } finally {
    await app.close();
    rl.close();
  }
}

bootstrap().catch((error) => logError('Bootstrap error: ' + error));
