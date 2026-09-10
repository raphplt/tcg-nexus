import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { CardGame } from "../common/enums/cardGame";
import { RequestLocale } from "../translation/request-locale";
import type { SupportedLocale } from "../translation/supported-locales";
import { CardService } from "./card.service";

/**
 * Controller exposing card catalog query and search endpoints.
 */
@ApiTags("cards")
@Controller("cards")
export class CardController {
  constructor(private readonly cardService: CardService) {}

  /**
   * Retrieves all cards matching optional game filter.
   *
   * @param game Optional card game filter.
   * @returns List of matching cards.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: "Retrieve all cards with optional game filter" })
  @ApiQuery({ name: "game", required: false, enum: CardGame })
  findAll(@Query("game") game?: CardGame) {
    return this.cardService.findAll(game);
  }

  /**
   * Retrieves a paginated list of catalog cards.
   *
   * @param page Page index (1-based).
   * @param limit Maximum number of records per page.
   * @param game Optional card game filter.
   * @returns Paginated cards result.
   */
  @Public()
  @Get("paginated")
  @ApiOperation({ summary: "Retrieve paginated catalog cards" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "game", required: false, enum: CardGame })
  findAllPaginated(
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("game") game?: CardGame,
  ) {
    return this.cardService.findAllPaginated(page, limit, game);
  }

  /**
   * Performs full-text or prefix search on card names and details.
   *
   * @param search Search query string.
   * @param game Optional card game filter.
   * @returns List of matching cards.
   */
  @Public()
  @Get("search/:search")
  @ApiOperation({ summary: "Search cards by name or keywords" })
  @ApiParam({ name: "search", description: "Search query text" })
  @ApiQuery({ name: "game", required: false, enum: CardGame })
  findBySearch(
    @Param("search") search: string,
    @Query("game") game?: CardGame,
  ) {
    return this.cardService.findBySearch(search, game);
  }

  /**
   * Returns a randomly selected catalog card.
   *
   * @param game Optional card game filter.
   * @returns Random card entity or null.
   */
  @Public()
  @Get("random")
  @ApiOperation({ summary: "Retrieve a random card" })
  @ApiQuery({ name: "game", required: false, enum: CardGame })
  findRandom(@Query("game") game?: CardGame) {
    return this.cardService.findRandom(game);
  }

  /**
   * Retrieves all distinct card rarities present in an expansion set.
   *
   * @param setId Expansion set ID.
   * @param locale Target locale for localized rarity strings.
   * @returns Array of unique rarity names.
   */
  @Public()
  @Get("set/:setId/rarities")
  @ApiOperation({
    summary: "Retrieve unique card rarities for an expansion set",
  })
  @ApiParam({ name: "setId", description: "Expansion set identifier" })
  getSetRarities(
    @Param("setId") setId: string,
    @RequestLocale() locale: SupportedLocale,
  ) {
    return this.cardService.getSetRarities(setId, locale);
  }

  /**
   * Retrieves a specific card by its UUID.
   *
   * @param id Card UUID.
   * @returns Card entity.
   */
  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Retrieve card details by UUID" })
  @ApiParam({ name: "id", description: "Card UUID" })
  findOne(@Param("id") id: string) {
    return this.cardService.findOne(id);
  }
}
