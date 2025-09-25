import { Injectable } from '@nestjs/common';

@Injectable()
export class PokemonSeriesService {
  create() {
    return 'This action adds a new pokemonSery';
  }

  findAll() {
    return `This action returns all pokemonSeries`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pokemonSery`;
  }

  update(id: number) {
    return `This action updates a #${id} pokemonSery`;
  }

  remove(id: number) {
    return `This action removes a #${id} pokemonSery`;
  }

  import() {
    return `This action imports pokemonSeries`;
  }
}
