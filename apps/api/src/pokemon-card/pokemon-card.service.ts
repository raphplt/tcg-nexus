import { Injectable } from '@nestjs/common';
import { CreatePokemonCardDto } from './dto/create-pokemon-card.dto';
import { UpdatePokemonCardDto } from './dto/update-pokemon-card.dto';

@Injectable()
export class PokemonCardService {
  create(createPokemonCardDto: CreatePokemonCardDto) {
    return 'This action adds a new pokemonCard';
  }

  findAll() {
    return `This action returns all pokemonCard`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pokemonCard`;
  }

  update(id: number, updatePokemonCardDto: UpdatePokemonCardDto) {
    return `This action updates a #${id} pokemonCard`;
  }

  remove(id: number) {
    return `This action removes a #${id} pokemonCard`;
  }
}
