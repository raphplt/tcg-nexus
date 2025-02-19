import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from '../seed/seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(SeedService);

  try {
    const importedSeries = await seedService.importPokemonSeries();
    console.log('Imported Pokémon series:', importedSeries);
    const importedSets = await seedService.importPokemonSets();
    console.log('Imported Pokémon sets:', importedSets);
  } catch (error) {
    console.error('Error importing Pokémon:', error);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => console.error('Bootstrap error:', error));
