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
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { DeckService } from "./deck.service";
import { DeckInsightsDto } from "../ai/dto/deck-insights.dto";
import { RequestLocale } from "../translation/request-locale";
import type { SupportedLocale } from "../translation/supported-locales";
import { CreateDeckDto } from "./dto/create-deck.dto";
import { FindAllDecksQueryDto } from "./dto/find-all-decks-query.dto";
import { ImportDeckJsonDto } from "./dto/import-deck-json.dto";
import { ShareDeckDto } from "./dto/share-deck.dto";
import { DeckInventoryService } from "./deck-inventory.service";
import { UpdateDeckDto } from "./dto/update-deck.dto";

@ApiTags("decks")
@Controller("deck")
export class DeckController {
  constructor(
    private readonly deckService: DeckService,
    private readonly deckInventoryService: DeckInventoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get(":id/inventory-requirements")
  @ApiOperation({
    summary: "Compare deck requirements against user inventory",
  })
  getInventoryRequirements(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.deckInventoryService.getDeckInventoryRequirements(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: User, @Body() createDeckDto: CreateDeckDto) {
    return this.deckService.createDeck(user, createDeckDto);
  }

  @Public()
  @Get()
  findAll(@Query() query: FindAllDecksQueryDto) {
    return this.deckService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get("/me")
  findAllFromUSer(
    @CurrentUser() user: User,
    @Query() query: FindAllDecksQueryDto,
  ) {
    return this.deckService.findAllFromUser(user, query);
  }

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

  @UseGuards(JwtAuthGuard)
  @Get("/saved/ids")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Retrieve IDs of decks saved in user library",
  })
  findSavedDeckIds(@CurrentUser() user: User) {
    return this.deckService.findSavedDeckIds(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/save")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Save a public deck to user library" })
  saveDeck(@Param("id") id: string, @CurrentUser() user: User) {
    return this.deckService.saveDeckToLibrary(+id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id/save")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Remove a deck from user library" })
  unsaveDeck(@Param("id") id: string, @CurrentUser() user: User) {
    return this.deckService.removeDeckFromLibrary(+id, user);
  }

  @Public()
  @Get("export/:id")
  @ApiOperation({ summary: "Export a deck to JSON format" })
  exportDeck(@Param("id") id: string, @CurrentUser() user?: User) {
    return this.deckService.exportDeck(+id, user);
  }

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

  @Public()
  @Get("user/:userId/public")
  findPublicDecksByUser(
    @Param("userId", ParseIntPipe) userId: number,
    @Query() query: FindAllDecksQueryDto,
  ) {
    return this.deckService.findPublicDecksByUser(userId, query);
  }

  @Public()
  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user?: User) {
    return this.deckService.findOneWithCards(+id, user);
  }

  @Public()
  @Post(":id/analyze")
  @ApiOperation({
    summary: "Analyze a deck and provide insights",
    description:
      "Deterministic analysis computed locally: composition, draw engine, energy curve, evolution lines, and legality. No external services called.",
  })
  @ApiOkResponse({ type: DeckInsightsDto })
  analyze(
    @Param("id") id: string,
    @RequestLocale() locale: SupportedLocale,
    @CurrentUser() user?: User,
  ): Promise<DeckInsightsDto> {
    return this.deckService.analyzeDeck(+id, user, locale);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Body() updateDeckDto: UpdateDeckDto,
  ) {
    return this.deckService.updateDeck(+id, user, updateDeckDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: User) {
    return this.deckService.remove(+id, user);
  }

  @Post(":id/clone")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  clone(@Param("id") id: string, @CurrentUser() user: User) {
    return this.deckService.cloneDeck(+id, user);
  }

  @Public()
  @Post(":id/view")
  incrementView(@Param("id") id: string) {
    return this.deckService.incrementViews(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/share")
  @ApiBearerAuth()
  share(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Body() dto?: ShareDeckDto,
  ) {
    return this.deckService.shareDeck(+id, user, dto);
  }

  @Public()
  @Get("import/:code")
  getDeckForImport(@Param("code") code: string) {
    return this.deckService.getDeckForImport(code);
  }

  @UseGuards(JwtAuthGuard)
  @Post("import/:code")
  @ApiBearerAuth()
  importDeck(@Param("code") code: string, @CurrentUser() user: User) {
    return this.deckService.importDeck(code, user);
  }
}
