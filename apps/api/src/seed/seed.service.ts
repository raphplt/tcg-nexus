import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { PokemonSerie } from '@/pokemon-series/entities/pokemon-sery.entity';
import * as pokemonSeriesData from '@/common/data/pokemon_series.json';
import { CreateSeedDto } from './dto/create-seed.dto';
import { UpdateSeedDto } from './dto/update-seed.dto';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(PokemonSerie)
    private readonly pokemonSerieRepository: Repository<PokemonSerie>,
  ) {}

  create(createSeedDto: CreateSeedDto) {
    return 'This action adds a new seed';
  }

  findAll() {
    return `This action returns all seed`;
  }

  findOne(id: number) {
    return `This action returns a #${id} seed`;
  }

  update(id: number, updateSeedDto: UpdateSeedDto) {
    return `This action updates a #${id} seed`;
  }

  remove(id: number) {
    return `This action removes a #${id} seed`;
  }

  async importPokemonSeries() {
    const series = (pokemonSeriesData as DeepPartial<PokemonSerie>[]).map(
      (serie) => this.pokemonSerieRepository.create(serie),
    );
    await this.pokemonSerieRepository.save(series);
    return series;
  }
}
