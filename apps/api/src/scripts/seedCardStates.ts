import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { SeedService } from 'src/seed/seed.service';

async function bootstrap() {
  console.log('🌱 Seeding CardStates...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(SeedService);

  try {
    const seedStates = await seedService.seedCardStates();
    console.log(`✅ Successfully seeded ${seedStates.length} CardStates`);

    seedStates.forEach((state) => {
      console.log(`  📝 ${state.label} (${state.code})`);
    });

    console.log('🎉 CardState seeding completed!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }

  await app.close();
}

void bootstrap();
