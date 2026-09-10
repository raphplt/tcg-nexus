import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { UpsertOnlineSessionDto } from "./dto/upsert-online-session.dto";
import { MatchOnlineService } from "./online/match-online.service";

/**
 * Controller managing live online tournament match sessions and deck eligibility.
 */
@ApiTags("match-online")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("matches/:id/online")
export class MatchOnlineController {
  constructor(private readonly matchOnlineService: MatchOnlineService) {}

  /**
   * Evaluates user deck eligibility for the specified online match.
   *
   * @param id - Match unique identifier.
   * @param request - Express request containing authenticated user.
   * @returns Deck eligibility assessment.
   */
  @ApiOperation({ summary: "Check deck eligibility for an online match" })
  @Get("deck-eligibility")
  getDeckEligibility(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.matchOnlineService.getDeckEligibility(id, request.user as User);
  }

  /**
   * Retrieves player perspective of the active online match session.
   *
   * @param id - Match unique identifier.
   * @param request - Express request containing authenticated user.
   * @returns Perspective game state.
   */
  @ApiOperation({
    summary: "Get player-specific perspective of an active online match",
  })
  @Get("session")
  getSessionView(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.matchOnlineService.getSessionView(id, request.user as User);
  }

  /**
   * Creates or updates an online match session with the selected deck.
   *
   * @param id - Match unique identifier.
   * @param request - Express request containing authenticated user.
   * @param body - Session payload containing deck identifier.
   * @returns Created or updated online session entity.
   */
  @ApiOperation({
    summary: "Join or update an online match session with selected deck",
  })
  @Post("session")
  upsertSession(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: Request,
    @Body() body: UpsertOnlineSessionDto,
  ) {
    return this.matchOnlineService.upsertSession(
      id,
      request.user as User,
      body.deckId,
    );
  }
}
