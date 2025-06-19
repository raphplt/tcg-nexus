import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query
} from '@nestjs/common';
import { PokemonCardService } from './pokemon-card.service';
import { CreatePokemonCardDto } from './dto/create-pokemon-card.dto';
import { UpdatePokemonCardDto } from './dto/update-pokemon-card.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

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

  @Get('paginated')
  findAllPaginated(@Query() paginationDto: PaginationDto) {
    return this.pokemonCardService.findAllPaginated(
      paginationDto.page,
      paginationDto.limit
    );
  }

  // Routes statiques avant les routes dynamiques
  @Get('search/:search')
  findBySearch(@Param('search') search: string) {
    return this.pokemonCardService.findBySearch(search);
  }

  @Get('random')
  findRandom() {
    return this.pokemonCardService.findRandom();
  }

  // Route dynamique doit être la dernière pour éviter les conflits
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pokemonCardService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePokemonCardDto: UpdatePokemonCardDto
  ) {
    return this.pokemonCardService.update(id, updatePokemonCardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pokemonCardService.remove(id);
  }
}
