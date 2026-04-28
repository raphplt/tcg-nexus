import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "src/auth/decorators/public.decorator";
import { CreatePokemonSeryDto } from "./dto/create-pokemon-sery.dto";
import { UpdatePokemonSeryDto } from "./dto/update-pokemon-sery.dto";
import { PokemonSeriesService } from "./pokemon-series.service";

@ApiTags("pokemon-series")
@Controller("pokemon-series")
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

  @Get(":id")
  @Public()
  findOne(@Param("id") id: string) {
    return this.pokemonSeriesService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updatePokemonSeryDto: UpdatePokemonSeryDto,
  ) {
    return this.pokemonSeriesService.update(id, updatePokemonSeryDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.pokemonSeriesService.remove(id);
  }
}
