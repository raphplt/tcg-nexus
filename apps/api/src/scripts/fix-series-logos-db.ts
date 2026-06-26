import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import * as fs from "fs";
import * as path from "path";
import { AppModule } from "../app.module";
import { PokemonSerie } from "../pokemon-series/entities/pokemon-serie.entity";

async function bootstrap() {
  console.log("🌱 Updating series logos in database from JSON...");

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const pokemonSerieRepository = dataSource.getRepository(PokemonSerie);

  const seriesJsonPath = path.resolve(__dirname, "../../../../data/pokemon_series.json");

  if (!fs.existsSync(seriesJsonPath)) {
    console.error(`❌ Series JSON file not found at: ${seriesJsonPath}`);
    await app.close();
    return;
  }

  try {
    const seriesData = JSON.parse(fs.readFileSync(seriesJsonPath, "utf-8"));
    let updatedCount = 0;

    for (const serieData of seriesData) {
      if (!serieData.id) continue;

      const dbSerie = await pokemonSerieRepository.findOne({
        where: { id: serieData.id },
      });

      if (dbSerie) {
        if (dbSerie.logo !== serieData.logo) {
          console.log(`  Updating logo for ${dbSerie.name} (${dbSerie.id}): ${dbSerie.logo} -> ${serieData.logo}`);
          dbSerie.logo = serieData.logo;
          await pokemonSerieRepository.save(dbSerie);
          updatedCount++;
        }
      } else {
        console.log(`  ⚠️  Series ${serieData.name} (${serieData.id}) not found in DB`);
      }
    }

    console.log(`🎉 Finished! Updated ${updatedCount} series logos in database.`);
  } catch (error) {
    console.error("❌ Database update failed:", error);
  }

  await app.close();
}

void bootstrap();
