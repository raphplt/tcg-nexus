import { Injectable } from '@nestjs/common';
import { CreatePokemonSeryDto } from './dto/create-pokemon-sery.dto';
import { UpdatePokemonSeryDto } from './dto/update-pokemon-sery.dto';

@Injectable()
export class PokemonSeriesService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(dto: CreatePokemonSeryDto) {
    return 'This action adds a new pokemonSery';
  }

  findAll() {
    return `This action returns all pokemonSeries`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pokemonSery`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(id: number, dto: UpdatePokemonSeryDto) {
    return `This action updates a #${id} pokemonSery`;
  }

  remove(id: number) {
    return `This action removes a #${id} pokemonSery`;
  }

  import() {
    return `This action imports pokemonSeries`;
  }
}
