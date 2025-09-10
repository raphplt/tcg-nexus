import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete
} from '@nestjs/common';
import { PokemonSetService } from './pokemon-set.service';
import { CreatePokemonSetDto } from './dto/create-pokemon-set.dto';
import { UpdatePokemonSetDto } from './dto/update-pokemon-set.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('pokemon-set')
@Controller('pokemon-set')
export class PokemonSetController {
  constructor(private readonly pokemonSetService: PokemonSetService) {}

  @Post()
  create(@Body() createPokemonSetDto: CreatePokemonSetDto) {
    return this.pokemonSetService.create(createPokemonSetDto);
  }

  @Get()
  findAll() {
    return this.pokemonSetService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pokemonSetService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePokemonSetDto: UpdatePokemonSetDto
  ) {
    return this.pokemonSetService.update(id, updatePokemonSetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pokemonSetService.remove(+id);
  }
}
