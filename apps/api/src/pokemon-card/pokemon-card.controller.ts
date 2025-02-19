import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PokemonCardService } from './pokemon-card.service';
import { CreatePokemonCardDto } from './dto/create-pokemon-card.dto';
import { UpdatePokemonCardDto } from './dto/update-pokemon-card.dto';

@Controller('pokemon-card')
export class PokemonCardController {
  constructor(private readonly pokemonCardService: PokemonCardService) {}

  @Post()
  create(@Body() createPokemonCardDto: CreatePokemonCardDto) {
    return this.pokemonCardService.create(createPokemonCardDto);
  }

  @Get()
  findAll() {
    return this.pokemonCardService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pokemonCardService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePokemonCardDto: UpdatePokemonCardDto) {
    return this.pokemonCardService.update(+id, updatePokemonCardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pokemonCardService.remove(+id);
  }
}
