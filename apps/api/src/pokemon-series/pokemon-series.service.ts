import { Injectable } from '@nestjs/common';
import { CreatePokemonSeryDto } from './dto/create-pokemon-sery.dto';
import { UpdatePokemonSeryDto } from './dto/update-pokemon-sery.dto';

@Injectable()
export class PokemonSeriesService {
  create(createPokemonSeryDto: CreatePokemonSeryDto) {
    return 'This action adds a new pokemonSery';
  }

  findAll() {
    return `This action returns all pokemonSeries`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pokemonSery`;
  }

  update(id: number, updatePokemonSeryDto: UpdatePokemonSeryDto) {
    return `This action updates a #${id} pokemonSery`;
  }

  remove(id: number) {
    return `This action removes a #${id} pokemonSery`;
  }
}
