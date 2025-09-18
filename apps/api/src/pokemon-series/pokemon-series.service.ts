import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePokemonSeryDto } from './dto/create-pokemon-sery.dto';
import { UpdatePokemonSeryDto } from './dto/update-pokemon-sery.dto';
import { PokemonSerie } from './entities/pokemon-serie.entity';

@Injectable()
export class PokemonSeriesService {
  constructor(
    @InjectRepository(PokemonSerie)
    private readonly pokemonSeriesRepository: Repository<PokemonSerie>
  ) {}

  create(createPokemonSeryDto: CreatePokemonSeryDto) {
    return this.pokemonSeriesRepository.save(
      this.pokemonSeriesRepository.create(createPokemonSeryDto)
    );
  }

  async findAll(): Promise<PokemonSerie[]> {
    return this.pokemonSeriesRepository.find({
      select: ['id', 'name', 'logo']
    });
  }

  async findOne(id: number): Promise<PokemonSerie | null> {
    return this.pokemonSeriesRepository.findOne({
      where: { id: id.toString() },
      select: ['id', 'name', 'logo']
    });
  }

  async update(id: number, updatePokemonSeryDto: UpdatePokemonSeryDto) {
    await this.pokemonSeriesRepository.update(id, updatePokemonSeryDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.pokemonSeriesRepository.delete(id);
    return { deleted: true };
  }

  import() {
    return `This action imports pokemonSeries`;
  }
}
