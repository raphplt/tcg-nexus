import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { RequestLocale } from "../translation/request-locale";
import type { SupportedLocale } from "../translation/supported-locales";
import type { User } from "../user/entities/user.entity";
import { AiService } from "./ai.service";
import { AnalyzePoolDto } from "./dto/analyze-pool.dto";
import { DeckInsightsDto } from "./dto/deck-insights.dto";

/**
 * Deck intelligence endpoints.
 *
 * Everything here is computed locally from the catalog and pgvector: no
 * third-party provider is involved, so responses do not depend on the network.
 */
@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Analyzes an ad-hoc card pool, typically a list open in the deck builder.
   *
   * @param dto Cards and their quantities.
   * @param locale Locale to render diagnostics in.
   * @returns Deterministic deck insights.
   */
  @Public()
  @Post("decks/analyze")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: "Analyze an ad-hoc, unpersisted card pool",
    description:
      "Evaluates deck rules, consistency, energy curve, evolution lines, and legality for an in-progress deck list.",
  })
  @ApiOkResponse({ type: DeckInsightsDto })
  analyzePool(
    @Body() dto: AnalyzePoolDto,
    @RequestLocale() locale: SupportedLocale,
  ): Promise<DeckInsightsDto> {
    return this.aiService.analyzePool(dto, locale);
  }

  /**
   * Lists public decks closest to a deck's archetype.
   *
   * @param id Reference deck ID.
   * @param limit Maximum neighbours to return.
   * @param user Authenticated user, or undefined for anonymous callers.
   * @returns Neighbours, or an empty result explaining why none were found.
   */
  @Public()
  @Get("decks/:id/similar")
  @ApiOperation({
    summary: "Find similar public decks using local vector similarity",
  })
  findSimilarDecks(
    @Param("id", ParseIntPipe) id: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser() user?: User,
  ) {
    return this.aiService.findSimilarDecks(id, user, Math.min(limit, 25));
  }

  /**
   * Suggests cards that similar decks play and this one does not.
   *
   * @param id Reference deck ID.
   * @param limit Maximum suggestions to return.
   * @param locale Locale used to resolve card names.
   * @param user Authenticated user, or undefined for anonymous callers.
   * @returns Suggestions, or an empty result explaining why none were found.
   */
  @Public()
  @Get("decks/:id/suggestions")
  @ApiOperation({
    summary: "Suggest cards frequently played in similar decks",
  })
  suggestCards(
    @Param("id", ParseIntPipe) id: number,
    @Query("limit", new DefaultValuePipe(12), ParseIntPipe) limit: number,
    @RequestLocale() locale: SupportedLocale,
    @CurrentUser() user?: User,
  ) {
    return this.aiService.suggestCards(id, user, Math.min(limit, 30), locale);
  }
}
