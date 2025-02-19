import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import * as pokemonSeriesData from 'src/common/data/pokemon_series.json';
import { PokemonSerie } from 'src/pokemon-series/entities/pokemon-serie.entity';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(PokemonSerie)
    private readonly pokemonSerieRepository: Repository<PokemonSerie>,
  ) {}

  async importPokemonSeries() {
    const series = (pokemonSeriesData as DeepPartial<PokemonSerie>[]).map(
      (serie) => this.pokemonSerieRepository.create(serie),
    );
    await this.pokemonSerieRepository.save(series);
    return series;
  }
}
