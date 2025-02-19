import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PokemonSerie } from './pokemon-series/entities/pokemon-sery.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '3306', 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [PokemonSerie],
  synchronize: true,
});

async function importPokemonSeries() {
  await AppDataSource.initialize();
  const pokemonSeriesRepository = AppDataSource.getRepository(PokemonSerie);

  const filePath = path.join(
    __dirname,
    '../../common/data/pokemon_series.json',
  );
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const pokemonSeriesData = JSON.parse(fileContent);

  for (const series of pokemonSeriesData) {
    const pokemonSerie = new PokemonSerie();
    pokemonSerie.id = series.id;
    pokemonSerie.name = series.name;
    pokemonSerie.logo = series.logo;

    await pokemonSeriesRepository.save(pokemonSerie);
    console.log(`Imported series: ${series.name}`);
  }

  await AppDataSource.destroy();
}

importPokemonSeries().catch((error) =>
  console.error('Error importing series:', error),
);
