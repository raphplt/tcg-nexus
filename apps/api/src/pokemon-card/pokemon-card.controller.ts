import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PokemonCardsType } from "../common/enums/pokemonCardsType";
import { UserRole } from "../common/enums/user";
import { CardSyncService } from "./card-sync.service";
import { CreatePokemonCardDto } from "./dto/create-pokemon-card.dto";
import { FindAllPokemonCardDto } from "./dto/find-all-pokemon-card.dto";
import { ScanMatchDto } from "./dto/scan-match.dto";
import { UpdatePokemonCardDto } from "./dto/update-pokemon-card.dto";
import { PokemonCardService } from "./pokemon-card.service";

/**
 * Controller providing administrative management, queries, and OCR matching for Pokémon cards.
 */
@ApiTags("pokemon-card")
@Controller("pokemon-card")
export class PokemonCardController {
  constructor(
    private readonly pokemonCardService: PokemonCardService,
    private readonly cardSyncService: CardSyncService,
  ) {}

  /**
   * Triggers a manual synchronization run from TCGdex.
   *
   * @returns Sync execution summary.
   */
  @Post("sync")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Trigger manual Pokémon card sync from TCGdex",
  })
  sync() {
    return this.cardSyncService.syncAll();
  }

  /**
   * Creates a new Pokémon card definition.
   *
   * @param createPokemonCardDto Card creation payload.
   * @returns Newly created card entity.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new Pokémon card" })
  create(@Body() createPokemonCardDto: CreatePokemonCardDto) {
    return this.pokemonCardService.create(createPokemonCardDto);
  }

  /**
   * Retrieves an unpaginated list of cards (capped by service limit).
   *
   * @returns Array of cards.
   */
  @Get()
  @ApiOperation({ summary: "Retrieve cards capped by upper limit" })
  findAll() {
    return this.pokemonCardService.findAll();
  }

  /**
   * Retrieves a filtered and paginated list of Pokémon cards.
   *
   * @param query Search, set, series, rarity, and pagination filters.
   * @returns Paginated cards result.
   */
  @Public()
  @Get("paginated")
  @ApiOperation({ summary: "Retrieve paginated Pokémon cards with filters" })
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

  /**
   * Searches Pokémon cards by name or keywords.
   *
   * @param search Search keyword.
   * @param limit Optional maximum number of cards to return.
   * @returns Matching cards.
   */
  @Public()
  @Get("search/:search")
  @ApiOperation({ summary: "Search Pokémon cards by text" })
  @ApiParam({ name: "search", description: "Search query text" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findBySearch(
    @Param("search") search: string,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.pokemonCardService.findBySearch(search, parsedLimit);
  }

  /**
   * Retrieves a random Pokémon card matching optional series, rarity, and set criteria.
   *
   * @param serieId Optional series ID.
   * @param rarity Optional rarity name.
   * @param set Optional set ID.
   * @param category Optional card category (e.g. Pokemon).
   * @param excludeIds Comma-separated list of card IDs to exclude.
   * @returns Random card or null.
   */
  @Get("random")
  @Public()
  @ApiOperation({ summary: "Retrieve a random Pokémon card" })
  @ApiQuery({ name: "serieId", required: false, type: String })
  @ApiQuery({ name: "rarity", required: false, type: String })
  @ApiQuery({ name: "set", required: false, type: String })
  @ApiQuery({ name: "category", required: false, enum: PokemonCardsType })
  @ApiQuery({ name: "excludeIds", required: false, type: String })
  @ApiQuery({ name: "hasImage", required: false, type: Boolean })
  findRandom(
    @Query("serieId") serieId?: string,
    @Query("rarity") rarity?: string,
    @Query("set") set?: string,
    @Query("category") category?: PokemonCardsType,
    @Query("excludeIds") excludeIds?: string,
    @Query("hasImage") hasImage?: string,
  ) {
    const parsedExclude = excludeIds
      ? excludeIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;
    const parsedHasImage = hasImage === "true" || hasImage === "1";
    return this.pokemonCardService.findRandom(
      serieId,
      rarity,
      set,
      category,
      parsedExclude,
      parsedHasImage,
    );
  }

  /**
   * Retrieves the deterministic daily Pokémon species card for Pokedle.
   *
   * @param date Optional target date formatted as YYYY-MM-DD.
   * @returns Daily Pokémon card response.
   */
  @Get("species/daily")
  @Public()
  @ApiOperation({
    summary: "Retrieve deterministic daily Pokémon card for Pokedle",
  })
  @ApiQuery({
    name: "date",
    required: false,
    type: String,
    description: "YYYY-MM-DD",
  })
  getDailySpecies(@Query("date") date?: string) {
    return this.pokemonCardService.getDailySpecies(date);
  }

  /**
   * Retrieves a random list of distinct Pokémon species (e.g. for mini-games distractors).
   *
   * @param count Number of distinct species to draw.
   * @returns Array of species items localized in request locale.
   */
  @Get("species/random")
  @Public()
  @ApiOperation({ summary: "Retrieve random distinct Pokémon species" })
  @ApiQuery({ name: "count", required: false, type: Number })
  findRandomSpecies(@Query("count") count?: string) {
    const parsed = count ? Number.parseInt(count, 10) : 40;
    return this.pokemonCardService.findRandomSpecies(
      Number.isFinite(parsed) ? parsed : 40,
    );
  }

  /**
   * Matches candidate Pokémon cards using OCR scan parameters.
   *
   * @param dto Scan match query payload or cardName string.
   * @param localId Optional set-relative number (when called positionally).
   * @param setName Optional set name (when called positionally).
   * @param setNumber Optional set number (when called positionally).
   * @param setTotal Optional set total count (when called positionally).
   * @returns Ranked array of matching cards and confidence scores.
   */
  @Public()
  @Post("scan-match")
  @ApiOperation({
    summary: "Find Pokémon cards matching OCR-extracted scan data",
  })
  async scanMatch(
    @Body() dto?: ScanMatchDto | string,
    localId?: string,
    setName?: string,
    setNumber?: string,
    setTotal?: string,
  ) {
    if (dto && typeof dto === "object") {
      return this.pokemonCardService.findByScanMatch(dto);
    }
    return this.pokemonCardService.findByScanMatch({
      cardName: dto as unknown as string,
      localId,
      setName,
      setNumber,
      setTotal,
    });
  }

  /**
   * Retrieves a specific Pokémon card by its ID.
   *
   * @param id Card UUID or catalog identifier.
   * @returns Card entity.
   */
  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Retrieve Pokémon card details by ID" })
  @ApiParam({ name: "id", description: "Card identifier" })
  findOne(@Param("id") id: string) {
    return this.pokemonCardService.findOne(id);
  }

  /**
   * Updates an existing Pokémon card.
   *
   * @param id Card identifier.
   * @param updatePokemonCardDto Updated fields payload.
   * @returns Updated card entity.
   */
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update Pokémon card details" })
  @ApiParam({ name: "id", description: "Card identifier" })
  update(
    @Param("id") id: string,
    @Body() updatePokemonCardDto: UpdatePokemonCardDto,
  ) {
    return this.pokemonCardService.update(id, updatePokemonCardDto);
  }

  /**
   * Removes a Pokémon card from the catalog.
   *
   * @param id Card identifier.
   * @returns Deletion confirmation.
   */
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a Pokémon card" })
  @ApiParam({ name: "id", description: "Card identifier" })
  remove(@Param("id") id: string) {
    return this.pokemonCardService.remove(id);
  }
}
