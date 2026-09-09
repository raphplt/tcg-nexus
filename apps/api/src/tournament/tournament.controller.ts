import {
  BadRequestException,
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
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "../common/enums/user";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RankingService } from "../ranking/ranking.service";
import { User } from "../user/entities/user.entity";
import { BulkRegistrationActionDto } from "./dto/bulk-registration-action.dto";
import { BulkStartMatchesDto } from "./dto/bulk-start-matches.dto";
import { CreateTournamentDto } from "./dto/create-tournament.dto";
import { RegisterTournamentDto } from "./dto/register-tournament.dto";
import {
  OverrideDeckLegalityDto,
  SubmitTournamentDeckDto,
} from "./dto/tournament-deck-snapshot.dto";
import {
  DropPlayerDto,
  RoundControlAction,
  RoundControlDto,
  ScoreCorrectionApplyDto,
  ScoreCorrectionPreviewDto,
} from "./dto/tournament-incident.dto";
import { TournamentQueryDto } from "./dto/tournament-query.dto";
import { UpdateTournamentDto } from "./dto/update-tournament.dto";
import { UpdateTournamentStatusDto } from "./dto/update-tournament-status.dto";
import { TournamentStatus } from "./entities";
import { OrganizerRole } from "./entities/tournament-organizer.entity";
import {
  TournamentOrganizerGuard,
  TournamentOrganizerRoles,
  TournamentOwnerGuard,
  TournamentParticipantGuard,
  TournamentVisibilityGuard,
} from "./guards";
import { PublicTournamentDataInterceptor } from "./interceptors/public-tournament-data.interceptor";
import { TournamentDeckSnapshotService } from "./services/tournament-deck-snapshot.service";
import { TournamentIncidentService } from "./services/tournament-incident.service";
import { TournamentRoundClockService } from "./services/tournament-round-clock.service";
import { TournamentService } from "./tournament.service";

/**
 * REST controller for tournament orchestration, bracket operations,
 * deck legality enforcement, round clock controls, and incident management.
 */
@ApiTags("tournaments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("tournaments")
export class TournamentController {
  constructor(
    private readonly tournamentService: TournamentService,
    private readonly rankingService: RankingService,
    private readonly snapshotService: TournamentDeckSnapshotService,
    private readonly clockService: TournamentRoundClockService,
    private readonly incidentService: TournamentIncidentService,
  ) {}

  /**
   * Creates a new tournament entity.
   *
   * @param createTournamentDto - Tournament configuration payload.
   * @param user - Authenticated user creating the tournament.
   * @returns Created tournament entity.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, "pro")
  @ApiOperation({ summary: "Create a new tournament" })
  async create(
    @Body() createTournamentDto: CreateTournamentDto,
    @CurrentUser() user: User,
  ) {
    return this.tournamentService.create(createTournamentDto, user.id);
  }

  /**
   * Lists public tournaments with optional filtering and pagination.
   *
   * @param query - Query parameters (status, game format, pagination).
   * @returns Paginated list of public tournaments.
   */
  @Public()
  @Get()
  @UseInterceptors(PublicTournamentDataInterceptor)
  @ApiOperation({ summary: "List public tournaments with optional filters" })
  async findAll(@Query() query: TournamentQueryDto) {
    return this.tournamentService.findAll({ ...query, isPublic: true });
  }

  /**
   * Lists upcoming public tournaments.
   *
   * @param limit - Optional maximum items to return.
   * @returns List of upcoming tournaments.
   */
  @Public()
  @Get("upcoming")
  @UseInterceptors(PublicTournamentDataInterceptor)
  @ApiOperation({ summary: "List upcoming public tournaments" })
  async getUpcomingTournaments(@Query("limit") limit?: number) {
    return this.tournamentService.getUpcomingTournaments(limit);
  }

  /**
   * Lists concluded past tournaments.
   *
   * @param limit - Optional maximum items to return.
   * @returns List of past tournaments.
   */
  @Public()
  @Get("past")
  @UseInterceptors(PublicTournamentDataInterceptor)
  @ApiOperation({ summary: "List concluded past tournaments" })
  async getPastTournaments(@Query("limit") limit?: number) {
    return this.tournamentService.getPastTournaments(limit);
  }

  /**
   * Retrieves full details for a tournament by identifier.
   *
   * @param id - Tournament unique identifier.
   * @returns Tournament entity with relations.
   */
  @Public()
  @Get(":id")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  @ApiOperation({ summary: "Retrieve tournament details by ID" })
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.tournamentService.findOne(id);
  }

  /**
   * Retrieves aggregated statistics for a tournament.
   *
   * @param id - Tournament unique identifier.
   * @returns Aggregated tournament statistics.
   */
  @Public()
  @Get(":id/stats")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  @ApiOperation({ summary: "Retrieve aggregated tournament statistics" })
  async getTournamentStats(@Param("id", ParseIntPipe) id: number) {
    return this.tournamentService.getTournamentStats(id);
  }

  /**
   * Updates tournament settings and metadata.
   *
   * @param id - Tournament unique identifier.
   * @param updateTournamentDto - Update payload.
   * @returns Updated tournament entity.
   */
  @Patch(":id")
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  @ApiOperation({ summary: "Update tournament details" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateTournamentDto: UpdateTournamentDto,
  ) {
    return this.tournamentService.update(id, updateTournamentDto);
  }

  /**
   * Updates tournament lifecycle status.
   *
   * @param id - Tournament unique identifier.
   * @param updateStatusDto - Target status payload.
   * @returns Updated tournament entity.
   */
  @Patch(":id/status")
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  @ApiOperation({ summary: "Update tournament lifecycle status" })
  async updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateTournamentStatusDto,
  ) {
    return this.tournamentService.updateStatus(id, updateStatusDto);
  }

  /**
   * Registers current authenticated user as a player in the tournament.
   *
   * @param id - Tournament unique identifier.
   * @param registrationDto - Registration details and deck notes.
   * @param user - Current authenticated user.
   * @returns Created tournament registration record.
   */
  @Post(":id/register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register current user as player in tournament" })
  async registerPlayer(
    @Param("id", ParseIntPipe) id: number,
    @Body() registrationDto: RegisterTournamentDto,
    @CurrentUser() user: User,
  ) {
    const playerId = await this.tournamentService.findPlayerIdByUserId(user.id);
    if (!playerId) {
      throw new BadRequestException(
        "Un profil joueur est requis pour s'inscrire à un tournoi",
      );
    }

    return this.tournamentService.registerPlayer({
      tournamentId: id,
      playerId,
      notes: registrationDto.notes,
    });
  }

  /**
   * Unregisters a player from the tournament.
   *
   * @param id - Tournament unique identifier.
   * @param playerId - Player unique identifier.
   */
  @Delete(":id/register/:playerId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TournamentParticipantGuard)
  @ApiOperation({ summary: "Unregister a player from tournament" })
  async unregisterPlayer(
    @Param("id", ParseIntPipe) id: number,
    @Param("playerId", ParseIntPipe) playerId: number,
  ) {
    return this.tournamentService.unregisterPlayer(id, playerId);
  }

  /**
   * Lists tournaments associated with a given player.
   *
   * @param playerId - Player unique identifier.
   * @param query - Query filter parameters.
   * @returns Paginated list of player tournaments.
   */
  @Get("player/:playerId")
  @ApiOperation({ summary: "List tournaments for a specific player" })
  async getPlayerTournaments(
    @Param("playerId", ParseIntPipe) playerId: number,
    @Query() query: TournamentQueryDto,
  ) {
    return this.tournamentService.getPlayerTournaments(playerId, query);
  }

  /**
   * Lists tournaments organized by a user.
   *
   * @param userId - User unique identifier.
   * @param query - Query filter parameters.
   * @returns Paginated list of organized tournaments.
   */
  @Get("organizer/:userId")
  @ApiOperation({ summary: "List tournaments organized by a user" })
  async getOrganizerTournaments(
    @Param("userId", ParseIntPipe) userId: number,
    @Query() query: TournamentQueryDto,
  ) {
    return this.tournamentService.getOrganizerTournaments(userId, query);
  }

  /**
   * Deletes a tournament entity.
   *
   * @param id - Tournament unique identifier.
   * @param user - Current authenticated owner user.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TournamentOwnerGuard)
  @ApiOperation({ summary: "Delete a tournament (owner only)" })
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.tournamentService.remove(id, user);
  }

  /**
   * Starts tournament and generates bracket or round 1 pairings.
   *
   * @param id - Tournament unique identifier.
   * @param options - Seeding and check-in options.
   * @returns Started tournament entity.
   */
  @Post(":id/start")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  @ApiOperation({ summary: "Start tournament and generate opening matches" })
  async startTournament(
    @Param("id", ParseIntPipe) id: number,
    @Body() options?: { seedingMethod?: string; checkInRequired?: boolean },
  ) {
    return await this.tournamentService.startTournament(id, options);
  }

  /**
   * Concludes the tournament and finalizes standings and payouts.
   *
   * @param id - Tournament unique identifier.
   */
  @Post(":id/finish")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  @ApiOperation({ summary: "Conclude tournament and finalize results" })
  async finishTournament(@Param("id", ParseIntPipe) id: number) {
    return await this.tournamentService.finishTournament(id);
  }

  /**
   * Cancels tournament with an optional explanation reason.
   *
   * @param id - Tournament unique identifier.
   * @param body - Optional cancellation reason.
   */
  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  @ApiOperation({ summary: "Cancel tournament with reason" })
  async cancelTournament(
    @Param("id", ParseIntPipe) id: number,
    @Body() body?: { reason?: string },
  ) {
    return await this.tournamentService.cancelTournament(id, body?.reason);
  }

  /**
   * Advances the tournament to the next round.
   *
   * @param id - Tournament unique identifier.
   */
  @Post(":id/advance-round")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  @ApiOperation({ summary: "Advance tournament to next round" })
  async advanceToNextRound(@Param("id", ParseIntPipe) id: number) {
    return await this.tournamentService.advanceToNextRound(id);
  }

  /**
   * Retrieves current bracket tree structure.
   *
   * @param id - Tournament unique identifier.
   */
  @Public()
  @Get(":id/bracket")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  @ApiOperation({ summary: "Retrieve tournament bracket structure" })
  async getBracket(@Param("id", ParseIntPipe) id: number) {
    return await this.tournamentService.getBracket(id);
  }

  /**
   * Retrieves match pairings for current or requested round.
   *
   * @param id - Tournament unique identifier.
   * @param round - Optional round number.
   */
  @Public()
  @Get(":id/pairings")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  @ApiOperation({ summary: "Retrieve match pairings for a round" })
  async getCurrentPairings(
    @Param("id", ParseIntPipe) id: number,
    @Query("round", new ParseIntPipe({ optional: true })) round?: number,
  ) {
    return await this.tournamentService.getCurrentPairings(id, round);
  }

  /**
   * Retrieves overall tournament standings and player rankings.
   *
   * @param id - Tournament unique identifier.
   */
  @Public()
  @Get(":id/rankings")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  @ApiOperation({ summary: "Retrieve tournament rankings and standings" })
  async getTournamentRankings(@Param("id", ParseIntPipe) id: number) {
    return await this.tournamentService.getTournamentRankings(id);
  }

  /**
   * Retrieves real-time tournament progression metrics.
   *
   * @param id - Tournament unique identifier.
   */
  @Public()
  @Get(":id/progress")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  @ApiOperation({ summary: "Retrieve real-time tournament progress metrics" })
  getTournamentProgress(@Param("id", ParseIntPipe) id: number) {
    return this.tournamentService.getTournamentProgress(id);
  }

  /**
   * Retrieves valid state transitions from current status.
   *
   * @param id - Tournament unique identifier.
   */
  @Get(":id/state/transitions")
  @ApiOperation({ summary: "Retrieve permissible state machine transitions" })
  getAvailableTransitions(@Param("id", ParseIntPipe) id: number) {
    return this.tournamentService.getAvailableTransitions(id);
  }

  /**
   * Validates whether a target state transition is allowed.
   *
   * @param id - Tournament unique identifier.
   * @param body - Target status payload.
   */
  @Post(":id/state/validate")
  @ApiOperation({ summary: "Validate potential state transition" })
  validateStateTransition(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { targetStatus: string },
  ) {
    return this.tournamentService.validateStateTransition(
      id,
      body.targetStatus as TournamentStatus,
    );
  }

  /**
   * Retrieves matches for a tournament with pagination and optional round/status filters.
   *
   * @param id - Unique identifier of the tournament.
   * @param round - Optional round number filter.
   * @param status - Optional match status filter.
   * @param page - Optional page number for pagination.
   * @param limit - Optional maximum number of matches per page.
   * @returns Paginated list of tournament matches.
   */
  @ApiOperation({
    summary: "List matches for a tournament with optional filters",
  })
  @Public()
  @Get(":id/matches")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  getTournamentMatches(
    @Param("id", ParseIntPipe) id: number,
    @Query("round", new ParseIntPipe({ optional: true })) round?: number,
    @Query("status") status?: string,
    @Query("page", new ParseIntPipe({ optional: true })) page?: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.tournamentService.getTournamentMatches(id, {
      round,
      status,
      page,
      limit,
    });
  }

  /**
   * Retrieves the currently authenticated user's pending match in the tournament.
   *
   * @param id - Unique identifier of the tournament.
   * @param user - Current authenticated user.
   * @returns Pending match entity or null.
   */
  @ApiOperation({ summary: "Get current user pending match in tournament" })
  @Get(":id/matches/me")
  getMyPendingTournamentMatch(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.tournamentService.getMyPendingMatch(id, user.id);
  }

  /**
   * Retrieves details for a specific match within a tournament.
   *
   * @param id - Unique identifier of the tournament.
   * @param matchId - Unique identifier of the match.
   * @returns Match entity details.
   */
  @ApiOperation({ summary: "Get specific tournament match details" })
  @Public()
  @Get(":id/matches/:matchId")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  getTournamentMatch(
    @Param("id", ParseIntPipe) id: number,
    @Param("matchId", ParseIntPipe) matchId: number,
  ) {
    return this.tournamentService.getTournamentMatch(id, matchId);
  }

  /**
   * Updates scores and status for a specific tournament match.
   *
   * @param id - Unique identifier of the tournament.
   * @param matchId - Unique identifier of the match.
   * @param updateData - Match score updates and status payload.
   * @returns Updated match record.
   */
  @ApiOperation({ summary: "Update tournament match scores and status" })
  @Patch(":id/matches/:matchId")
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(
    OrganizerRole.OWNER,
    OrganizerRole.ADMIN,
    OrganizerRole.MODERATOR,
  )
  updateTournamentMatch(
    @Param("id", ParseIntPipe) id: number,
    @Param("matchId", ParseIntPipe) matchId: number,
    @Body()
    updateData: {
      playerAScore?: number;
      playerBScore?: number;
      status?: string;
    },
  ) {
    return this.tournamentService.updateTournamentMatch(
      id,
      matchId,
      updateData,
    );
  }

  /**
   * Starts multiple pending matches in bulk for a tournament round.
   *
   * @param id - Unique identifier of the tournament.
   * @param startDto - Data transfer object containing match IDs to start.
   * @returns Bulk start operation result.
   */
  @ApiOperation({ summary: "Start multiple tournament matches in bulk" })
  @Post(":id/matches/bulk-start")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(
    OrganizerRole.OWNER,
    OrganizerRole.ADMIN,
    OrganizerRole.MODERATOR,
  )
  startTournamentMatchesInBulk(
    @Param("id", ParseIntPipe) id: number,
    @Body() startDto: BulkStartMatchesDto,
  ) {
    return this.tournamentService.startTournamentMatchesInBulk(
      id,
      startDto.matchIds,
    );
  }

  /**
   * Retrieves all player registrations for a tournament with optional status filter.
   *
   * @param id - Unique identifier of the tournament.
   * @param status - Optional registration status filter.
   * @returns List of tournament registrations.
   */
  @ApiOperation({ summary: "List player registrations for a tournament" })
  @Get(":id/registrations")
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(
    OrganizerRole.OWNER,
    OrganizerRole.ADMIN,
    OrganizerRole.MODERATOR,
  )
  getTournamentRegistrations(
    @Param("id", ParseIntPipe) id: number,
    @Query("status") status?: string,
  ) {
    return this.tournamentService.getTournamentRegistrations(id, status);
  }

  /**
   * Applies a bulk action (confirm, cancel, or reject) across multiple tournament registrations.
   *
   * @param id - Unique identifier of the tournament.
   * @param actionDto - Bulk registration action payload.
   * @returns Summary of affected registrations.
   */
  @ApiOperation({ summary: "Perform bulk actions on player registrations" })
  @Post(":id/registrations/bulk-action")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(
    OrganizerRole.OWNER,
    OrganizerRole.ADMIN,
    OrganizerRole.MODERATOR,
  )
  updateRegistrationsInBulk(
    @Param("id", ParseIntPipe) id: number,
    @Body() actionDto: BulkRegistrationActionDto,
  ) {
    return this.tournamentService.updateRegistrationsInBulk(id, actionDto);
  }

  /**
   * Confirms a pending registration for a tournament player.
   *
   * @param id - Unique identifier of the tournament.
   * @param registrationId - Unique identifier of the registration.
   * @returns Confirmed registration entity.
   */
  @ApiOperation({ summary: "Confirm a player registration" })
  @Patch(":id/registrations/:registrationId/confirm")
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(
    OrganizerRole.OWNER,
    OrganizerRole.ADMIN,
    OrganizerRole.MODERATOR,
  )
  confirmRegistration(
    @Param("id", ParseIntPipe) id: number,
    @Param("registrationId", ParseIntPipe) registrationId: number,
  ) {
    return this.tournamentService.confirmRegistration(id, registrationId);
  }

  /**
   * Cancels an existing tournament registration with an optional reason.
   *
   * @param id - Unique identifier of the tournament.
   * @param registrationId - Unique identifier of the registration.
   * @param body - Optional cancellation payload containing reason.
   * @returns Cancelled registration entity.
   */
  @ApiOperation({ summary: "Cancel a player registration" })
  @Patch(":id/registrations/:registrationId/cancel")
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(
    OrganizerRole.OWNER,
    OrganizerRole.ADMIN,
    OrganizerRole.MODERATOR,
  )
  cancelRegistration(
    @Param("id", ParseIntPipe) id: number,
    @Param("registrationId", ParseIntPipe) registrationId: number,
    @Body() body?: { reason?: string },
  ) {
    return this.tournamentService.cancelRegistration(
      id,
      registrationId,
      body?.reason,
    );
  }

  /**
   * Checks in a registered player for tournament check-in verification.
   *
   * @param id - Unique identifier of the tournament.
   * @param registrationId - Unique identifier of the registration.
   * @param user - Current authenticated user checking in.
   * @returns Updated registration entity.
   */
  @ApiOperation({ summary: "Check in a registered player" })
  @Patch(":id/registrations/:registrationId/check-in")
  checkInPlayer(
    @Param("id", ParseIntPipe) id: number,
    @Param("registrationId", ParseIntPipe) registrationId: number,
    @CurrentUser() user: User,
  ) {
    return this.tournamentService.checkInPlayer(id, registrationId, user);
  }

  /**
   * Fills a tournament with mock/random players for simulation and testing (Admin only).
   *
   * @param id - Unique identifier of the tournament.
   * @param body - Optional payload containing target player count.
   * @returns Array of created registrations.
   */
  @ApiOperation({ summary: "Fill tournament with random players (Admin only)" })
  @Post(":id/fill-with-players")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  async fillWithPlayers(
    @Param("id", ParseIntPipe) id: number,
    @Body() body?: { count?: number },
  ) {
    const count = body?.count || 8;
    return this.tournamentService.fillWithRandomPlayers(id, count);
  }

  /**
   * Checks in all registered players for the tournament in bulk.
   *
   * @param id - Unique identifier of the tournament.
   * @returns Bulk check-in operation result.
   */
  @ApiOperation({ summary: "Check in all registered players" })
  @Post(":id/check-in-all")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(
    OrganizerRole.OWNER,
    OrganizerRole.ADMIN,
    OrganizerRole.MODERATOR,
  )
  async checkInAllPlayers(@Param("id", ParseIntPipe) id: number) {
    return this.tournamentService.checkInAllPlayers(id);
  }

  // --- TRN-02: Deck Snapshot & Policy ---

  /**
   * Submits or updates a deck snapshot list for a tournament participant.
   *
   * @param id - Unique identifier of the tournament.
   * @param user - Authenticated user submitting the deck list.
   * @param dto - Deck submission payload.
   * @returns Created or updated deck snapshot record.
   */
  @ApiOperation({ summary: "Submit or update deck snapshot for tournament" })
  @Post(":id/deck-snapshot")
  @HttpCode(HttpStatus.OK)
  async submitDeckSnapshot(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() dto: SubmitTournamentDeckDto,
  ) {
    return this.snapshotService.submitDeckSnapshot(id, user.id, dto);
  }

  /**
   * Retrieves the current authenticated user's submitted deck snapshot for the tournament.
   *
   * @param id - Unique identifier of the tournament.
   * @param user - Current authenticated user.
   * @returns Active deck snapshot or null.
   */
  @ApiOperation({ summary: "Get current user deck snapshot for tournament" })
  @Get(":id/my-deck-snapshot")
  async getMyDeckSnapshot(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.snapshotService.getMyDeckSnapshot(id, user.id);
  }

  /**
   * Lists submitted deck snapshots for a tournament based on visibility rules and user permissions.
   *
   * @param id - Unique identifier of the tournament.
   * @param user - Current authenticated user querying snapshots.
   * @returns List of deck snapshots.
   */
  @ApiOperation({ summary: "List deck snapshots for a tournament" })
  @Get(":id/deck-snapshots")
  @UseGuards(TournamentVisibilityGuard)
  async getTournamentDeckSnapshots(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.snapshotService.getTournamentDeckSnapshots(id, user);
  }

  /**
   * Records an organizer decision overriding a submitted deck snapshot legality status.
   *
   * @param id - Unique identifier of the tournament.
   * @param snapshotId - Unique identifier of the target deck snapshot.
   * @param user - Authenticated organizer overriding legality.
   * @param dto - Legality override payload with status and rationale.
   * @returns Updated deck snapshot record.
   */
  @ApiOperation({
    summary: "Override legality status of a submitted deck snapshot",
  })
  @Post(":id/deck-snapshots/:snapshotId/legality")
  @HttpCode(HttpStatus.OK)
  async overrideDeckLegality(
    @Param("id", ParseIntPipe) id: number,
    @Param("snapshotId", ParseIntPipe) snapshotId: number,
    @CurrentUser() user: User,
    @Body() dto: OverrideDeckLegalityDto,
  ) {
    return this.snapshotService.overrideLegality(id, snapshotId, user, {
      legalityStatus: dto.legalityStatus,
      reason: dto.reason,
    });
  }

  /**
   * Lists all historical submission revisions recorded for a deck snapshot.
   *
   * @param _id - Unique identifier of the tournament.
   * @param snapshotId - Unique identifier of the deck snapshot.
   * @returns Array of deck snapshot revision records.
   */
  @ApiOperation({ summary: "Get historical revision list for a deck snapshot" })
  @Get(":id/deck-snapshots/:snapshotId/revisions")
  @UseGuards(TournamentVisibilityGuard)
  async getDeckSnapshotRevisions(
    @Param("id", ParseIntPipe) _id: number,
    @Param("snapshotId", ParseIntPipe) snapshotId: number,
  ) {
    return this.snapshotService.getRevisions(snapshotId);
  }

  // --- TRN-03: Round Clock & Controls ---

  /**
   * Controls the round clock (start, pause, resume, extend) for the active tournament round.
   *
   * @param id - Unique identifier of the tournament.
   * @param user - Authenticated organizer issuing the clock action.
   * @param dto - Round clock control payload.
   * @returns Updated round clock status.
   */
  @ApiOperation({
    summary: "Control round clock (start, pause, resume, extend)",
  })
  @Post(":id/round-clock")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(
    OrganizerRole.OWNER,
    OrganizerRole.ADMIN,
    OrganizerRole.MODERATOR,
  )
  async controlRoundClock(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() dto: RoundControlDto,
  ) {
    switch (dto.action) {
      case RoundControlAction.START:
        return this.clockService.startRoundClock(
          id,
          undefined,
          dto.durationMinutes,
          user,
        );
      case RoundControlAction.PAUSE:
        return this.clockService.pauseRoundClock(id, dto.reason, user);
      case RoundControlAction.RESUME:
        return this.clockService.resumeRoundClock(id, user);
      case RoundControlAction.EXTEND:
        return this.clockService.extendRoundClock(
          id,
          dto.extensionMinutes ?? 5,
          dto.reason,
          user,
        );
    }
  }

  /**
   * Retrieves current round clock timing and operational status.
   *
   * @param id - Unique identifier of the tournament.
   * @returns Active round clock status.
   */
  @ApiOperation({ summary: "Get round clock status for active round" })
  @Public()
  @Get(":id/round-clock")
  @UseGuards(TournamentVisibilityGuard)
  async getRoundClockStatus(@Param("id", ParseIntPipe) id: number) {
    return this.clockService.getRoundClockStatus(id);
  }

  // --- TRN-04: Explainable Standings ---

  /**
   * Computes and returns explainable standings including tiebreak metric breakdowns.
   *
   * @param id - Unique identifier of the tournament.
   * @returns Explainable standings response.
   */
  @ApiOperation({
    summary: "Get explainable tournament standings with tiebreak breakdowns",
  })
  @Public()
  @Get(":id/standings")
  @UseGuards(TournamentVisibilityGuard)
  async getExplainableStandings(@Param("id", ParseIntPipe) id: number) {
    return this.rankingService.getExplainableStandings(id);
  }

  // --- TRN-05: Player Dashboard & Incidents ---

  /**
   * Retrieves player-specific tournament dashboard view including pairings and active match.
   *
   * @param id - Unique identifier of the tournament.
   * @param user - Current authenticated user.
   * @returns Player tournament dashboard data.
   */
  @ApiOperation({ summary: "Get player dashboard for tournament" })
  @Get(":id/player-dashboard")
  async getPlayerDashboard(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.incidentService.getPlayerDashboard(id, user.id);
  }

  /**
   * Drops a player from the tournament, whether self-requested or applied by an organizer.
   *
   * @param id - Unique identifier of the tournament.
   * @param user - Authenticated user initiating or executing the drop.
   * @param dto - Drop player payload specifying registration and reason.
   * @returns Updated player registration or incident record.
   */
  @ApiOperation({ summary: "Drop player from tournament" })
  @Post(":id/drop-player")
  @HttpCode(HttpStatus.OK)
  async dropPlayer(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() dto: DropPlayerDto,
  ) {
    return this.incidentService.dropPlayer(id, user, dto);
  }

  /**
   * Previews recalculated standings resulting from a retroactive match score correction.
   *
   * @param id - Unique identifier of the tournament.
   * @param dto - Score correction preview payload.
   * @returns Projected standings comparison.
   */
  @ApiOperation({
    summary: "Preview standings impact of match score correction",
  })
  @Post(":id/score-correction/preview")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(
    OrganizerRole.OWNER,
    OrganizerRole.ADMIN,
    OrganizerRole.MODERATOR,
  )
  async previewScoreCorrection(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ScoreCorrectionPreviewDto,
  ) {
    return this.incidentService.previewScoreCorrection(id, dto);
  }

  /**
   * Applies a retroactive match score correction, logs an audit incident, and updates tournament state.
   *
   * @param id - Unique identifier of the tournament.
   * @param user - Authenticated organizer applying the correction.
   * @param dto - Score correction payload.
   * @returns Incident resolution confirmation.
   */
  @ApiOperation({
    summary:
      "Apply retroactive match score correction and update tournament state",
  })
  @Post(":id/score-correction/apply")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(
    OrganizerRole.OWNER,
    OrganizerRole.ADMIN,
    OrganizerRole.MODERATOR,
  )
  async applyScoreCorrection(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() dto: ScoreCorrectionApplyDto,
  ) {
    return this.incidentService.applyScoreCorrection(id, user, dto);
  }
}
