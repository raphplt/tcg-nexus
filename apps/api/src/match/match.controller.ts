import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import { CreateMatchDto } from "./dto/create-match.dto";
import {
  ReportScoreDto,
  ResetMatchDto,
  StartMatchDto,
} from "./dto/match-operations.dto";
import {
  ProposeMatchResultDto,
  ResolveMatchDisputeDto,
  RespondMatchResultDto,
} from "./dto/match-result-proposal.dto";
import { UpdateMatchDto } from "./dto/update-match.dto";
import { MatchPermissionGuard } from "./guards/match-permission.guard";
import { MatchResultService } from "./match-result.service";
import { MatchQueryDto, MatchService } from "./match.service";

/**
 * Controller managing tournament and ranked matches, score reporting, and dispute arbitration.
 */
@ApiTags("matches")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("matches")
export class MatchController {
  constructor(
    private readonly matchService: MatchService,
    private readonly matchResultService: MatchResultService,
  ) {}

  /**
   * Retrieves player's active play hub overview including pending matches and active sessions.
   *
   * @param user - Current authenticated user.
   * @returns Play hub status with ongoing and upcoming matches.
   */
  @ApiOperation({
    summary:
      "Get player's active play hub overview (matches, ongoing sessions, and pairings)",
  })
  @Get("play-hub")
  getPlayHub(@CurrentUser() user: User) {
    return this.matchService.getPlayHub(user.id);
  }

  /**
   * Creates a new match record.
   *
   * @param createMatchDto - Match parameters payload.
   * @returns Newly created match entity.
   */
  @ApiOperation({ summary: "Create a new match record" })
  @Post()
  @UseGuards(MatchPermissionGuard)
  create(@Body() createMatchDto: CreateMatchDto) {
    return this.matchService.create(createMatchDto);
  }

  /**
   * Lists matches with pagination and filters (Admin/Moderator only).
   *
   * @param query - Match filter parameters.
   * @returns Paginated match list.
   */
  @ApiOperation({
    summary: "List matches with pagination and filters (Admin/Moderator only)",
  })
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  findAll(@Query() query: MatchQueryDto) {
    return this.matchService.findAll(query);
  }

  /**
   * Retrieves match details by ID.
   *
   * @param id - Unique match identifier.
   * @returns Match entity.
   */
  @ApiOperation({ summary: "Get match details by ID" })
  @Get(":id")
  @UseGuards(MatchPermissionGuard)
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.matchService.findOne(id);
  }

  /**
   * Updates match scores, participants, or configuration.
   *
   * @param id - Unique match identifier.
   * @param updateMatchDto - Update payload.
   * @returns Updated match entity.
   */
  @ApiOperation({
    summary: "Update match scores, participants, or configuration",
  })
  @Patch(":id")
  @UseGuards(MatchPermissionGuard)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateMatchDto: UpdateMatchDto,
  ) {
    return this.matchService.update(id, updateMatchDto);
  }

  /**
   * Deletes a match record.
   *
   * @param id - Unique match identifier.
   */
  @ApiOperation({ summary: "Delete a match record" })
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(MatchPermissionGuard)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.matchService.remove(id);
  }

  /**
   * Starts a match and initializes round timing.
   *
   * @param id - Unique match identifier.
   * @param startMatchDto - Start match payload.
   * @returns Updated match entity.
   */
  @ApiOperation({ summary: "Start a match and initialize match timer" })
  @Post(":id/start")
  @HttpCode(HttpStatus.OK)
  @UseGuards(MatchPermissionGuard)
  startMatch(
    @Param("id", ParseIntPipe) id: number,
    @Body() startMatchDto: StartMatchDto,
  ) {
    return this.matchService.startMatch(id, startMatchDto);
  }

  /**
   * Reports official match score and declares the winner.
   *
   * @param id - Unique match identifier.
   * @param reportScoreDto - Score report payload.
   * @returns Completed match entity.
   */
  @ApiOperation({
    summary: "Report official match score and declare winner",
  })
  @Post(":id/report-score")
  @HttpCode(HttpStatus.OK)
  @UseGuards(MatchPermissionGuard)
  reportScore(
    @Param("id", ParseIntPipe) id: number,
    @Body() reportScoreDto: ReportScoreDto,
  ) {
    return this.matchService.reportScore(id, reportScoreDto);
  }

  /**
   * Resets match status and score back to scheduled.
   *
   * @param id - Unique match identifier.
   * @param resetMatchDto - Reset payload.
   * @returns Reset match entity.
   */
  @ApiOperation({ summary: "Reset match status and score back to scheduled" })
  @Post(":id/reset")
  @HttpCode(HttpStatus.OK)
  @UseGuards(MatchPermissionGuard)
  resetMatch(
    @Param("id", ParseIntPipe) id: number,
    @Body() resetMatchDto: ResetMatchDto,
  ) {
    return this.matchService.resetMatch(id, resetMatchDto);
  }

  /**
   * Retrieves all matches for a specific tournament round.
   *
   * @param tournamentId - Tournament identifier.
   * @param round - Round number.
   * @returns Array of matches for the round.
   */
  @ApiOperation({
    summary: "Get all matches for a specific tournament round",
  })
  @Get("tournament/:tournamentId/round/:round")
  getMatchesByRound(
    @Param("tournamentId", ParseIntPipe) tournamentId: number,
    @Param("round", ParseIntPipe) round: number,
  ) {
    return this.matchService.getMatchesByRound(tournamentId, round);
  }

  /**
   * Retrieves tournament matches for a specific player.
   *
   * @param playerId - Player user identifier.
   * @param tournamentId - Tournament identifier.
   * @returns Array of player's matches in the tournament.
   */
  @ApiOperation({
    summary: "Get tournament matches for a specific player",
  })
  @Get("player/:playerId/tournament/:tournamentId")
  getPlayerMatches(
    @Param("playerId", ParseIntPipe) playerId: number,
    @Param("tournamentId", ParseIntPipe) tournamentId: number,
  ) {
    return this.matchService.getPlayerMatches(tournamentId, playerId);
  }

  /**
   * Proposes a match outcome from a participant player slot.
   *
   * @param id - Unique match identifier.
   * @param user - Authenticated user proposing score.
   * @param dto - Match result proposal payload.
   * @returns Created proposal record.
   */
  @ApiOperation({ summary: "Propose match outcome from player slot" })
  @Post(":id/propose-result")
  @HttpCode(HttpStatus.OK)
  @UseGuards(MatchPermissionGuard)
  proposeResult(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() dto: ProposeMatchResultDto,
  ) {
    return this.matchResultService.proposeResult(id, user.id, dto);
  }

  /**
   * Accepts, rejects, or contests a proposed match outcome.
   *
   * @param id - Unique match identifier.
   * @param user - Opponent player responding to proposal.
   * @param dto - Response action payload (ACCEPT, REJECT).
   * @returns Updated match or proposal record.
   */
  @ApiOperation({
    summary: "Accept, reject, or contest proposed match outcome",
  })
  @Post(":id/respond-result")
  @HttpCode(HttpStatus.OK)
  @UseGuards(MatchPermissionGuard)
  respondResult(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() dto: RespondMatchResultDto,
  ) {
    return this.matchResultService.respondResult(id, user.id, dto);
  }

  /**
   * Arbitrates and resolves a contested match dispute.
   *
   * @param id - Unique match identifier.
   * @param user - Authenticated user or arbitrator.
   * @param dto - Dispute resolution payload.
   * @returns Resolved match entity.
   */
  @ApiOperation({ summary: "Arbitrate and resolve match dispute" })
  @Post(":id/resolve-dispute")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.USER)
  resolveDispute(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() dto: ResolveMatchDisputeDto,
  ) {
    return this.matchResultService.resolveDispute(id, user, dto);
  }

  /**
   * Lists all result proposals and arbitration dispute history for a match.
   *
   * @param id - Unique match identifier.
   * @returns Array of proposals.
   */
  @ApiOperation({
    summary: "List result proposals and dispute history for a match",
  })
  @Get(":id/proposals")
  @UseGuards(MatchPermissionGuard)
  getProposals(@Param("id", ParseIntPipe) id: number) {
    return this.matchResultService.getMatchProposals(id);
  }
}
