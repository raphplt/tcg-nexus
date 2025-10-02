import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete
} from '@nestjs/common';
import { PokemonSeriesService } from './pokemon-series.service';
import { CreatePokemonSeryDto } from './dto/create-pokemon-sery.dto';
import { UpdatePokemonSeryDto } from './dto/update-pokemon-sery.dto';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('pokemon-series')
@Controller('pokemon-series')
export class PokemonSeriesController {
  constructor(private readonly pokemonSeriesService: PokemonSeriesService) {}

  @Post()
  create(@Body() createPokemonSeryDto: CreatePokemonSeryDto) {
    return this.pokemonSeriesService.create(createPokemonSeryDto);
  }

  @Get()
  @Public()
  findAll() {
    return this.pokemonSeriesService.findAll();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.pokemonSeriesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePokemonSeryDto: UpdatePokemonSeryDto
  ) {
    return this.pokemonSeriesService.update(+id, updatePokemonSeryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pokemonSeriesService.remove(+id);
  }
}
