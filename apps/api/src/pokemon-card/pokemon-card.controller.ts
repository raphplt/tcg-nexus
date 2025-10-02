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
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('pokemon-card')
@Controller('pokemon-card')
export class PokemonCardController {
  constructor(private readonly pokemonCardService: PokemonCardService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  create(@Body() createPokemonCardDto: CreatePokemonCardDto) {
    return this.pokemonCardService.create(createPokemonCardDto);
  }

  @Get()
  findAll() {
    return this.pokemonCardService.findAll();
  }

  @Public()
  @Get('paginated')
  findAllPaginated(@Query() paginationDto: PaginationDto) {
    return this.pokemonCardService.findAllPaginated(
      paginationDto.page,
      paginationDto.limit
    );
  }

  @Public()
  @Get('search/:search')
  findBySearch(@Param('search') search: string) {
    return this.pokemonCardService.findBySearch(search);
  }

  @Get('random')
  @Public()
  findRandom(
    @Query('serieId') serieId?: string,
    @Query('rarity') rarity?: string,
    @Query('set') set?: string
  ) {
    return this.pokemonCardService.findRandom(serieId, rarity, set);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.pokemonCardService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  update(
    @Param('id') id: string,
    @Body() updatePokemonCardDto: UpdatePokemonCardDto
  ) {
    return this.pokemonCardService.update(id, updatePokemonCardDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  remove(@Param('id') id: string) {
    return this.pokemonCardService.remove(id);
  }
}
