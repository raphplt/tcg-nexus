import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from '../seed/seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(SeedService);

  try {
    console.log('Truncating tables...');
    await seedService.truncateTables();
    console.log('Truncated tables ✅');

    console.log('Importing Pokémon series...');
    await seedService.importPokemonSeries();
    console.log('Imported Pokémon series ✅');
    console.log('Importing Pokémon sets...');
    await seedService.importPokemonSets();
    console.log('Imported Pokémon sets ✅');
    console.log('Importing Pokémon...');
    await seedService.importPokemon();
    console.log('Imported Pokémon ✅');
  } catch (error) {
    console.error('Error importing Pokémon:', error);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => console.error('Bootstrap error:', error));
