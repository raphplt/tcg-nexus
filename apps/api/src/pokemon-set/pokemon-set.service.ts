import { Injectable } from '@nestjs/common';
import { CreatePokemonSetDto } from './dto/create-pokemon-set.dto';
import { UpdatePokemonSetDto } from './dto/update-pokemon-set.dto';

@Injectable()
export class PokemonSetService {
  create(createPokemonSetDto: CreatePokemonSetDto) {
    return 'This action adds a new pokemonSet';
  }

  findAll() {
    return `This action returns all pokemonSet`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pokemonSet`;
  }

  update(id: number, updatePokemonSetDto: UpdatePokemonSetDto) {
    return `This action updates a #${id} pokemonSet`;
  }

  remove(id: number) {
    return `This action removes a #${id} pokemonSet`;
  }
}
