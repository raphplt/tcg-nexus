import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import * as pokemonSeriesData from 'src/common/data/pokemon_series.json';
import * as pokemonSetsData from 'src/common/data/pokemon_sets.json';
import { PokemonSerie } from 'src/pokemon-series/entities/pokemon-serie.entity';
import { PokemonSet } from 'src/pokemon-set/entities/pokemon-set.entity';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(PokemonSerie)
    private readonly pokemonSerieRepository: Repository<PokemonSerie>,
    @InjectRepository(PokemonSet)
    private readonly pokemonSetRepository: Repository<PokemonSet>,
  ) {}

  async importPokemonSeries() {
    const series: PokemonSerie[] = [];

    for (const serieData of pokemonSeriesData as DeepPartial<PokemonSerie>[]) {
      const existingSerie = await this.pokemonSerieRepository.findOne({
        where: { name: serieData.name },
      });

      if (!existingSerie) {
        const newSerie = this.pokemonSerieRepository.create(serieData);
        series.push(newSerie);
      }
    }

    if (series.length > 0) {
      await this.pokemonSerieRepository.save(series);
    }

    return series;
  }

  async importPokemonSets() {
    const sets: PokemonSet[] = [];

    for (const setData of pokemonSetsData as DeepPartial<PokemonSet>[]) {
      const existingSet = await this.pokemonSetRepository.findOne({
        where: { name: setData.name },
      });

      if (!existingSet) {
        const serie = await this.pokemonSerieRepository.findOne({
          where: { id: setData.serie?.id },
        });

        if (serie) {
          const newSet = this.pokemonSetRepository.create({
            ...setData,
            serie,
          });
          sets.push(newSet);
        }
      }
    }

    if (sets.length > 0) {
      await this.pokemonSetRepository.save(sets);
    }

    return sets;
  }
}
