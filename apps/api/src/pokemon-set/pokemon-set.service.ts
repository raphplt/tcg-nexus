import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePokemonSetDto } from './dto/create-pokemon-set.dto';
import { UpdatePokemonSetDto } from './dto/update-pokemon-set.dto';
import { PokemonSet } from './entities/pokemon-set.entity';

@Injectable()
export class PokemonSetService {
  constructor(
    @InjectRepository(PokemonSet)
    private readonly pokemonSetRepository: Repository<PokemonSet>
  ) {}

  async create(createPokemonSetDto: CreatePokemonSetDto): Promise<PokemonSet> {
    const pokemonSet = this.pokemonSetRepository.create(createPokemonSetDto);
    return this.pokemonSetRepository.save(pokemonSet);
  }

  async findAll(): Promise<PokemonSet[]> {
    return this.pokemonSetRepository.find({
      order: {
        releaseDate: 'DESC'
      }
    });
  }

  async findOne(id: string): Promise<PokemonSet> {
    const pokemonSet = await this.pokemonSetRepository.findOne({
      where: { id }
    });
    if (!pokemonSet) {
      throw new Error(`PokemonSet with id ${id} not found`);
    }
    return pokemonSet;
  }

  async update(
    id: string,
    updatePokemonSetDto: UpdatePokemonSetDto
  ): Promise<PokemonSet> {
    await this.pokemonSetRepository.update(id, updatePokemonSetDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.pokemonSetRepository.delete(id);
  }
}
