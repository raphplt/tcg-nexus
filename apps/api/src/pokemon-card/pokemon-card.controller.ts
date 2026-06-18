import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "src/auth/decorators/public.decorator";
import { Roles } from "src/auth/decorators/roles.decorator";
import { UserRole } from "src/common/enums/user";
import { FindAllPokemonCardDto } from "./dto/find-all-pokemon-card.dto";
import { CreatePokemonCardDto } from "./dto/create-pokemon-card.dto";
import { UpdatePokemonCardDto } from "./dto/update-pokemon-card.dto";
import { PokemonCardService } from "./pokemon-card.service";

@ApiTags("pokemon-card")
@Controller("pokemon-card")
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
  @Get("paginated")
  findAllPaginated(@Query() query: FindAllPokemonCardDto) {
    return this.pokemonCardService.findAllPaginated(
      query.page,
      query.limit,
      query.search,
      query.setId,
      query.serieId,
      query.rarity,
      query.type,
    );
  }

  @Public()
  @Get("search/:search")
  findBySearch(@Param("search") search: string) {
    return this.pokemonCardService.findBySearch(search);
  }

  @Get("random")
  @Public()
  findRandom(
    @Query("serieId") serieId?: string,
    @Query("rarity") rarity?: string,
    @Query("set") set?: string,
  ) {
    return this.pokemonCardService.findRandom(serieId, rarity, set);
  }

  /**
   * Endpoint dédié au scan OCR mobile.
   * Reçoit les données parsées depuis la photo et retourne les meilleures cartes candidates scorées.
   * Public pour éviter les problèmes d'auth pendant le scan.
   */
  @Public()
  @Post("scan-match")
  @ApiOperation({
    summary: "Trouve les cartes correspondant aux données extraites par OCR",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        cardName: { type: "string", description: "Nom extrait par OCR" },
        localId: {
          type: "string",
          description: "Numéro dans le set ex: 045 ou 045/198",
        },
        setName: { type: "string", description: "Nom du set extrait" },
        setNumber: { type: "string", description: "Numéro brut avant /" },
        setTotal: { type: "string", description: "Total du set après /" },
      },
    },
  })
  async scanMatch(
    @Body("cardName") cardName?: string,
    @Body("localId") localId?: string,
    @Body("setName") setName?: string,
    @Body("setNumber") setNumber?: string,
    @Body("setTotal") setTotal?: string,
  ) {
    return this.pokemonCardService.findByScanMatch({
      cardName,
      localId,
      setName,
      setNumber,
      setTotal,
    });
  }

  @Get(":id")
  @Public()
  findOne(@Param("id") id: string) {
    return this.pokemonCardService.findOne(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  update(
    @Param("id") id: string,
    @Body() updatePokemonCardDto: UpdatePokemonCardDto,
  ) {
    return this.pokemonCardService.update(id, updatePokemonCardDto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  remove(@Param("id") id: string) {
    return this.pokemonCardService.remove(id);
  }
}
