import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { DeckInsightsDto } from "../ai/dto/deck-insights.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RequestLocale } from "../translation/request-locale";
import type { SupportedLocale } from "../translation/supported-locales";
import { User } from "../user/entities/user.entity";
import { DeckService } from "./deck.service";
import { DeckInventoryService } from "./deck-inventory.service";
import { CreateDeckDto } from "./dto/create-deck.dto";
import { DeckInventoryRequirementsDto } from "./dto/deck-inventory-requirements.dto";
import { FindAllDecksQueryDto } from "./dto/find-all-decks-query.dto";
import { ImportDeckJsonDto } from "./dto/import-deck-json.dto";
import { ShareDeckDto } from "./dto/share-deck.dto";
import { UpdateDeckDto } from "./dto/update-deck.dto";

/**
 * Controller managing deck creation, cards management, export/import, analysis, and library interactions.
 */
@ApiTags("decks")
@Controller("deck")
export class DeckController {
  constructor(
    private readonly deckService: DeckService,
    private readonly deckInventoryService: DeckInventoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Compares deck card requirements against the current user's card inventory.
   *
   * @param id Deck unique identifier.
   * @param user Current authenticated user.
   * @returns Detailed inventory comparison and available marketplace offers.
   */
  @UseGuards(JwtAuthGuard)
  @Get(":id/inventory-requirements")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Compare deck requirements against user inventory",
  })
  @ApiParam({ name: "id", type: Number, description: "Deck unique identifier" })
  @ApiOkResponse({ type: DeckInventoryRequirementsDto })
  getInventoryRequirements(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.deckInventoryService.getDeckInventoryRequirements(id, user);
  }

  /**
   * Creates a new deck for the current user.
   *
   * @param user Current authenticated user.
   * @param createDeckDto Deck configuration payload.
   * @returns Newly created deck entity.
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new user deck" })
  create(@CurrentUser() user: User, @Body() createDeckDto: CreateDeckDto) {
    return this.deckService.createDeck(user, createDeckDto);
  }

  /**
   * Lists all public decks with optional search, filtering, and sorting.
   *
   * @param query Query parameters for pagination and filtering.
   * @returns Paginated list of public decks.
   */
  @Public()
  @Get()
  @ApiOperation({
    summary: "List public decks with optional search and filters",
  })
  findAll(@Query() query: FindAllDecksQueryDto) {
    return this.deckService.findAll(query);
  }

  /**
   * Lists decks owned by the authenticated user.
   *
   * @param user Current authenticated user.
   * @param query Query parameters for pagination and filtering.
   * @returns Paginated list of user decks.
   */
  @UseGuards(JwtAuthGuard)
  @Get("/me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List decks created by current user" })
  findAllFromUSer(
    @CurrentUser() user: User,
    @Query() query: FindAllDecksQueryDto,
  ) {
    return this.deckService.findAllFromUser(user, query);
  }

  /**
   * Clean alias for findAllFromUSer.
   */
  findAllFromUser(user: User, query: FindAllDecksQueryDto) {
    return this.findAllFromUSer(user, query);
  }

  /**
   * Lists decks saved in the authenticated user's library.
   *
   * @param user Current authenticated user.
   * @param query Query parameters for pagination.
   * @returns Paginated list of saved decks.
   */
  @UseGuards(JwtAuthGuard)
  @Get("/saved")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List decks saved in user library",
  })
  findSavedDecks(
    @CurrentUser() user: User,
    @Query() query: FindAllDecksQueryDto,
  ) {
    return this.deckService.findSavedDecks(user, query);
  }

  /**
   * Retrieves array of IDs of decks saved in the user library.
   *
   * @param user Current authenticated user.
   * @returns Array of saved deck IDs.
   */
  @UseGuards(JwtAuthGuard)
  @Get("/saved/ids")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Retrieve IDs of decks saved in user library",
  })
  findSavedDeckIds(@CurrentUser() user: User) {
    return this.deckService.findSavedDeckIds(user);
  }

  /**
   * Saves a public deck to the user's personal library.
   *
   * @param id Deck unique identifier.
   * @param user Current authenticated user.
   * @returns Saved deck association record.
   */
  @UseGuards(JwtAuthGuard)
  @Post(":id/save")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Save a public deck to user library" })
  @ApiParam({ name: "id", description: "Deck ID" })
  saveDeck(@Param("id") id: string, @CurrentUser() user: User) {
    return this.deckService.saveDeckToLibrary(+id, user);
  }

  /**
   * Removes a deck from the user's personal library.
   *
   * @param id Deck unique identifier.
   * @param user Current authenticated user.
   * @returns Removal result.
   */
  @UseGuards(JwtAuthGuard)
  @Delete(":id/save")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Remove a deck from user library" })
  @ApiParam({ name: "id", description: "Deck ID" })
  unsaveDeck(@Param("id") id: string, @CurrentUser() user: User) {
    return this.deckService.removeDeckFromLibrary(+id, user);
  }

  /**
   * Exports a deck to standardized JSON format.
   *
   * @param id Deck unique identifier.
   * @param user Optional authenticated user.
   * @returns Exported JSON deck structure.
   */
  @Public()
  @Get("export/:id")
  @ApiOperation({ summary: "Export a deck to JSON format" })
  @ApiParam({ name: "id", description: "Deck ID" })
  exportDeck(@Param("id") id: string, @CurrentUser() user?: User) {
    return this.deckService.exportDeck(+id, user);
  }

  /**
   * Imports a complete deck from a JSON payload.
   *
   * @param user Current authenticated user.
   * @param dto Exported JSON deck payload.
   * @returns Imported deck entity.
   */
  @UseGuards(JwtAuthGuard)
  @Post("import-json")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Import a deck from JSON payload" })
  importDeckFromJson(
    @CurrentUser() user: User,
    @Body() dto: ImportDeckJsonDto,
  ) {
    return this.deckService.importDeckFromJson(user, dto);
  }

  /**
   * Lists public decks created by a specific user.
   *
   * @param userId Target user ID.
   * @param query Query parameters for pagination.
   * @returns Paginated list of public decks.
   */
  @Public()
  @Get("user/:userId/public")
  @ApiOperation({ summary: "List public decks of a specific user" })
  @ApiParam({ name: "userId", type: Number, description: "Target user ID" })
  findPublicDecksByUser(
    @Param("userId", ParseIntPipe) userId: number,
    @Query() query: FindAllDecksQueryDto,
  ) {
    return this.deckService.findPublicDecksByUser(userId, query);
  }

  /**
   * Retrieves a single deck by ID including its configured cards.
   *
   * @param id Deck unique identifier.
   * @param user Optional authenticated caller.
   * @returns Deck entity with cards.
   */
  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Retrieve a deck by ID with card list" })
  @ApiParam({ name: "id", description: "Deck ID" })
  findOne(@Param("id") id: string, @CurrentUser() user?: User) {
    return this.deckService.findOneWithCards(+id, user);
  }

  /**
   * Analyzes a deck and provides deterministic composition metrics and insights.
   *
   * @param id Deck unique identifier.
   * @param locale Request locale.
   * @param user Optional authenticated caller.
   * @returns Deck analysis insights.
   */
  @Public()
  @Post(":id/analyze")
  @ApiOperation({
    summary: "Analyze a deck and provide insights",
    description:
      "Deterministic analysis computed locally: composition, draw engine, energy curve, evolution lines, and legality. No external services called.",
  })
  @ApiParam({ name: "id", description: "Deck ID" })
  @ApiOkResponse({ type: DeckInsightsDto })
  analyze(
    @Param("id") id: string,
    @RequestLocale() locale: SupportedLocale,
    @CurrentUser() user?: User,
  ): Promise<DeckInsightsDto> {
    return this.deckService.analyzeDeck(+id, user, locale);
  }

  /**
   * Updates an existing user deck.
   *
   * @param id Deck unique identifier.
   * @param user Current authenticated user.
   * @param updateDeckDto Deck update payload.
   * @returns Updated deck entity.
   */
  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update an existing user deck" })
  @ApiParam({ name: "id", description: "Deck ID" })
  update(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Body() updateDeckDto: UpdateDeckDto,
  ) {
    return this.deckService.updateDeck(+id, user, updateDeckDto);
  }

  /**
   * Deletes a user deck by ID.
   *
   * @param id Deck unique identifier.
   * @param user Current authenticated user.
   * @returns Deletion outcome.
   */
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a user deck by ID" })
  @ApiParam({ name: "id", description: "Deck ID" })
  remove(@Param("id") id: string, @CurrentUser() user: User) {
    return this.deckService.remove(+id, user);
  }

  /**
   * Clones an existing public or owned deck into the user's personal collection.
   *
   * @param id Deck unique identifier.
   * @param user Current authenticated user.
   * @returns Newly cloned deck entity.
   */
  @Post(":id/clone")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Clone an existing public or owned deck" })
  @ApiParam({ name: "id", description: "Deck ID" })
  clone(@Param("id") id: string, @CurrentUser() user: User) {
    return this.deckService.cloneDeck(+id, user);
  }

  /**
   * Increments the view counter for a public deck.
   *
   * @param id Deck unique identifier.
   * @returns Updated view count result.
   */
  @Public()
  @Post(":id/view")
  @ApiOperation({ summary: "Increment view counter for a public deck" })
  @ApiParam({ name: "id", description: "Deck ID" })
  incrementView(@Param("id") id: string) {
    return this.deckService.incrementViews(+id);
  }

  /**
   * Generates a shareable link or code for a deck.
   *
   * @param id Deck unique identifier.
   * @param user Current authenticated user.
   * @param dto Optional expiration payload.
   * @returns Created deck share record.
   */
  @UseGuards(JwtAuthGuard)
  @Post(":id/share")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a shareable link/code for a deck" })
  @ApiParam({ name: "id", description: "Deck ID" })
  share(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Body() dto?: ShareDeckDto,
  ) {
    return this.deckService.shareDeck(+id, user, dto);
  }

  /**
   * Previews a shared deck by its share code.
   *
   * @param code Share code.
   * @returns Shared deck preview data.
   */
  @Public()
  @Get("import/:code")
  @ApiOperation({ summary: "Preview a shared deck by share code" })
  @ApiParam({ name: "code", description: "Deck share code" })
  getDeckForImport(@Param("code") code: string) {
    return this.deckService.getDeckForImport(code);
  }

  /**
   * Imports a shared deck into the user's library using its share code.
   *
   * @param code Share code.
   * @param user Current authenticated user.
   * @returns Imported deck entity.
   */
  @UseGuards(JwtAuthGuard)
  @Post("import/:code")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Import a shared deck into user library" })
  @ApiParam({ name: "code", description: "Deck share code" })
  importDeck(@Param("code") code: string, @CurrentUser() user: User) {
    return this.deckService.importDeck(code, user);
  }
}
