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
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "src/common/enums/user";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { User } from "../user/entities/user.entity";
import { BulkRegistrationActionDto } from "./dto/bulk-registration-action.dto";
import { BulkStartMatchesDto } from "./dto/bulk-start-matches.dto";
import { CreateTournamentDto } from "./dto/create-tournament.dto";
import { RegisterTournamentDto } from "./dto/register-tournament.dto";
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
import { TournamentService } from "./tournament.service";

@ApiTags("tournaments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("tournaments")
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async create(
    @Body() createTournamentDto: CreateTournamentDto,
    @CurrentUser() user: User,
  ) {
    return this.tournamentService.create(createTournamentDto, user.id);
  }

  @Public()
  @Get()
  @UseInterceptors(PublicTournamentDataInterceptor)
  async findAll(@Query() query: TournamentQueryDto) {
    return this.tournamentService.findAll({ ...query, isPublic: true });
  }

  @Public()
  @Get("upcoming")
  @UseInterceptors(PublicTournamentDataInterceptor)
  async getUpcomingTournaments(@Query("limit") limit?: number) {
    return this.tournamentService.getUpcomingTournaments(limit);
  }

  @Public()
  @Get("past")
  @UseInterceptors(PublicTournamentDataInterceptor)
  async getPastTournaments(@Query("limit") limit?: number) {
    return this.tournamentService.getPastTournaments(limit);
  }

  @Public()
  @Get(":id")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.tournamentService.findOne(id);
  }

  @Public()
  @Get(":id/stats")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  async getTournamentStats(@Param("id", ParseIntPipe) id: number) {
    return this.tournamentService.getTournamentStats(id);
  }

  @Patch(":id")
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateTournamentDto: UpdateTournamentDto,
  ) {
    return this.tournamentService.update(id, updateTournamentDto);
  }

  @Patch(":id/status")
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  async updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateTournamentStatusDto,
  ) {
    return this.tournamentService.updateStatus(id, updateStatusDto);
  }

  @Post(":id/register")
  @HttpCode(HttpStatus.CREATED)
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

  @Delete(":id/register/:playerId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TournamentParticipantGuard)
  async unregisterPlayer(
    @Param("id", ParseIntPipe) id: number,
    @Param("playerId", ParseIntPipe) playerId: number,
  ) {
    return this.tournamentService.unregisterPlayer(id, playerId);
  }

  @Get("player/:playerId")
  async getPlayerTournaments(
    @Param("playerId", ParseIntPipe) playerId: number,
    @Query() query: TournamentQueryDto,
  ) {
    return this.tournamentService.getPlayerTournaments(playerId, query);
  }

  @Get("organizer/:userId")
  async getOrganizerTournaments(
    @Param("userId", ParseIntPipe) userId: number,
    @Query() query: TournamentQueryDto,
  ) {
    return this.tournamentService.getOrganizerTournaments(userId, query);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TournamentOwnerGuard)
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.tournamentService.remove(id, user);
  }

  @Post(":id/start")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  async startTournament(
    @Param("id", ParseIntPipe) id: number,
    @Body() options?: { seedingMethod?: string; checkInRequired?: boolean },
  ) {
    return await this.tournamentService.startTournament(id, options);
  }

  @Post(":id/finish")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  async finishTournament(@Param("id", ParseIntPipe) id: number) {
    return await this.tournamentService.finishTournament(id);
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  async cancelTournament(
    @Param("id", ParseIntPipe) id: number,
    @Body() body?: { reason?: string },
  ) {
    return await this.tournamentService.cancelTournament(id, body?.reason);
  }

  @Post(":id/advance-round")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  async advanceToNextRound(@Param("id", ParseIntPipe) id: number) {
    return await this.tournamentService.advanceToNextRound(id);
  }

  @Public()
  @Get(":id/bracket")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  async getBracket(@Param("id", ParseIntPipe) id: number) {
    return await this.tournamentService.getBracket(id);
  }

  @Public()
  @Get(":id/pairings")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  async getCurrentPairings(
    @Param("id", ParseIntPipe) id: number,
    @Query("round", new ParseIntPipe({ optional: true })) round?: number,
  ) {
    return await this.tournamentService.getCurrentPairings(id, round);
  }

  @Public()
  @Get(":id/rankings")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  async getTournamentRankings(@Param("id", ParseIntPipe) id: number) {
    return await this.tournamentService.getTournamentRankings(id);
  }

  @Public()
  @Get(":id/progress")
  @UseGuards(TournamentVisibilityGuard)
  @UseInterceptors(PublicTournamentDataInterceptor)
  getTournamentProgress(@Param("id", ParseIntPipe) id: number) {
    return this.tournamentService.getTournamentProgress(id);
  }

  @Get(":id/state/transitions")
  getAvailableTransitions(@Param("id", ParseIntPipe) id: number) {
    return this.tournamentService.getAvailableTransitions(id);
  }

  @Post(":id/state/validate")
  validateStateTransition(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { targetStatus: string },
  ) {
    return this.tournamentService.validateStateTransition(
      id,
      body.targetStatus as TournamentStatus,
    );
  }

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

  @Get(":id/matches/me")
  getMyPendingTournamentMatch(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.tournamentService.getMyPendingMatch(id, user.id);
  }

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

  @Patch(":id/registrations/:registrationId/check-in")
  checkInPlayer(
    @Param("id", ParseIntPipe) id: number,
    @Param("registrationId", ParseIntPipe) registrationId: number,
    @CurrentUser() user: User,
  ) {
    return this.tournamentService.checkInPlayer(id, registrationId, user);
  }

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
}
