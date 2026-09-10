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
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { CreateRankingDto } from "./dto/create-ranking.dto";
import { UpdateRankingDto } from "./dto/update-ranking.dto";
import { RankingService } from "./ranking.service";

/**
 * Controller exposing competitive player rankings, leaderboards, and ELO history endpoints.
 */
@ApiTags("ranking")
@Controller("ranking")
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  /**
   * Creates or records a new tournament ranking entry.
   *
   * @param createRankingDto Ranking record payload.
   * @returns Created ranking entity.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a tournament ranking entry" })
  create(@Body() createRankingDto: CreateRankingDto) {
    return this.rankingService.create(createRankingDto);
  }

  /**
   * Retrieves the global leaderboard rankings filtered by time period and game format.
   *
   * @param page Page index (1-based).
   * @param limit Maximum results per page.
   * @param period Timeframe filter (all-time, season, monthly).
   * @param format Tournament deck format filter.
   * @returns Paginated global rankings list.
   */
  @Public()
  @Get("global")
  @ApiOperation({ summary: "Retrieve global player rankings leaderboard" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
  @ApiQuery({
    name: "period",
    required: false,
    type: String,
    example: "all-time",
  })
  @ApiQuery({
    name: "format",
    required: false,
    type: String,
    example: "Standard",
  })
  getGlobalRanking(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("period") period?: string,
    @Query("format") format?: string,
  ) {
    return this.rankingService.getGlobalRanking(
      page ? +page : 1,
      limit ? +limit : 20,
      period || "all-time",
      format,
    );
  }

  /**
   * Retrieves the current authenticated player's ranking position and stats.
   *
   * @param user Current authenticated user.
   * @param period Timeframe filter.
   * @param format Tournament deck format filter.
   * @returns User's rank and standings data.
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Retrieve current user ranking position" })
  @ApiQuery({
    name: "period",
    required: false,
    type: String,
    example: "all-time",
  })
  @ApiQuery({
    name: "format",
    required: false,
    type: String,
    example: "Standard",
  })
  getMyRankingPosition(
    @CurrentUser() user: User,
    @Query("period") period?: string,
    @Query("format") format?: string,
  ) {
    return this.rankingService.getMyRankingPosition(
      user.id,
      period || "all-time",
      format,
    );
  }

  /**
   * Retrieves all tournament rankings.
   *
   * @returns Array of ranking records.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: "Retrieve all ranking entries" })
  findAll() {
    return this.rankingService.findAll();
  }

  /**
   * Retrieves the current authenticated user's ELO rating and recent match rating adjustments.
   *
   * @param user Current authenticated user.
   * @returns Object containing current ELO and recent rating adjustments history.
   */
  @Get("elo/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Retrieve current user ELO score and history" })
  async getMyElo(@CurrentUser() user: User) {
    const [elo, history] = await Promise.all([
      this.rankingService.getEloForUser(user.id),
      this.rankingService.getRecentEloHistory(user.id, 20),
    ]);
    return {
      elo,
      history: history.map((h) => ({
        id: h.id,
        createdAt: h.createdAt,
        delta: h.winner?.id === user.id ? h.delta : -h.delta,
        result:
          h.winner?.id === user.id
            ? "win"
            : h.loser?.id === user.id
              ? "loss"
              : "draw",
        opponentId:
          h.winner?.id === user.id ? h.loser?.id : (h.winner?.id ?? null),
        eloAfter: h.winner?.id === user.id ? h.winnerEloAfter : h.loserEloAfter,
      })),
    };
  }

  /**
   * Retrieves a specific ranking record by ID.
   *
   * @param id Ranking record identifier.
   * @returns Ranking entity.
   */
  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Retrieve a ranking entry by ID" })
  @ApiParam({ name: "id", description: "Ranking ID" })
  findOne(@Param("id") id: string) {
    return this.rankingService.findOne(+id);
  }

  /**
   * Updates an existing ranking record.
   *
   * @param id Ranking record identifier.
   * @param updateRankingDto Updated fields.
   * @returns Updated ranking entity.
   */
  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a ranking entry" })
  @ApiParam({ name: "id", description: "Ranking ID" })
  update(@Param("id") id: string, @Body() updateRankingDto: UpdateRankingDto) {
    return this.rankingService.update(+id, updateRankingDto);
  }

  /**
   * Removes a ranking record.
   *
   * @param id Ranking record identifier.
   * @returns Deletion confirmation.
   */
  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a ranking entry" })
  @ApiParam({ name: "id", description: "Ranking ID" })
  remove(@Param("id") id: string) {
    return this.rankingService.remove(+id);
  }
}
