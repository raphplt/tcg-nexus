import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  UseGuards
} from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentQueryDto } from './dto/tournament-query.dto';
import { UpdateTournamentStatusDto } from './dto/update-tournament-status.dto';
import { TournamentRegistrationDto } from './dto/tournament-registration.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  TournamentOrganizerGuard,
  TournamentParticipantGuard,
  TournamentOwnerGuard,
  TournamentOrganizerRoles
} from './guards';
import { OrganizerRole } from './entities/tournament-organizer.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { TournamentStatus } from './entities';
import { UserRole } from 'src/common/enums/user';

@ApiTags('tournaments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async create(
    @Body() createTournamentDto: CreateTournamentDto,
    @CurrentUser() user: User
  ) {
    return this.tournamentService.create(createTournamentDto, user.id);
  }

  @Public()
  @Get()
  async findAll(@Query() query: TournamentQueryDto) {
    return this.tournamentService.findAll(query);
  }

  @Public()
  @Get('upcoming')
  async getUpcomingTournaments(@Query('limit') limit?: number) {
    return this.tournamentService.getUpcomingTournaments(limit);
  }

  @Public()
  @Get('past')
  async getPastTournaments(@Query('limit') limit?: number) {
    return this.tournamentService.getPastTournaments(limit);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentService.findOne(id);
  }

  @Public()
  @Get(':id/stats')
  async getTournamentStats(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentService.getTournamentStats(id);
  }

  @Patch(':id')
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTournamentDto: UpdateTournamentDto
  ) {
    return this.tournamentService.update(id, updateTournamentDto);
  }

  @Patch(':id/status')
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateTournamentStatusDto
  ) {
    return this.tournamentService.updateStatus(id, updateStatusDto);
  }

  @Post(':id/register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(TournamentParticipantGuard)
  async registerPlayer(
    @Param('id', ParseIntPipe) id: number,
    @Body() registrationDto: Omit<TournamentRegistrationDto, 'tournamentId'>,
    @CurrentUser() user: User
  ) {
    const fullRegistrationDto: TournamentRegistrationDto = {
      ...registrationDto,
      tournamentId: id,
      playerId: registrationDto.playerId || user.player?.id || 0
    };
    return this.tournamentService.registerPlayer(fullRegistrationDto);
  }

  @Delete(':id/register/:playerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TournamentParticipantGuard)
  async unregisterPlayer(
    @Param('id', ParseIntPipe) id: number,
    @Param('playerId', ParseIntPipe) playerId: number
  ) {
    return this.tournamentService.unregisterPlayer(id, playerId);
  }

  @Get('player/:playerId')
  async getPlayerTournaments(
    @Param('playerId', ParseIntPipe) playerId: number,
    @Query() query: TournamentQueryDto
  ) {
    return this.tournamentService.getPlayerTournaments(playerId, query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TournamentOwnerGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentService.remove(id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  async startTournament(
    @Param('id', ParseIntPipe) id: number,
    @Body() options?: { seedingMethod?: string; checkInRequired?: boolean }
  ) {
    return await this.tournamentService.startTournament(id, options);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  async finishTournament(@Param('id', ParseIntPipe) id: number) {
    return await this.tournamentService.finishTournament(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  async cancelTournament(
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { reason?: string }
  ) {
    return await this.tournamentService.cancelTournament(id, body?.reason);
  }

  @Post(':id/advance-round')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(OrganizerRole.OWNER, OrganizerRole.ADMIN)
  async advanceToNextRound(@Param('id', ParseIntPipe) id: number) {
    return await this.tournamentService.advanceToNextRound(id);
  }

  @Public()
  @Get(':id/bracket')
  async getBracket(@Param('id', ParseIntPipe) id: number) {
    return await this.tournamentService.getBracket(id);
  }

  @Public()
  @Get(':id/pairings')
  async getCurrentPairings(
    @Param('id', ParseIntPipe) id: number,
    @Query('round', ParseIntPipe) round?: number
  ) {
    return await this.tournamentService.getCurrentPairings(id, round);
  }

  @Public()
  @Get(':id/rankings')
  async getTournamentRankings(@Param('id', ParseIntPipe) id: number) {
    return await this.tournamentService.getTournamentRankings(id);
  }

  @Public()
  @Get(':id/progress')
  getTournamentProgress(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentService.getTournamentProgress(id);
  }

  @Get(':id/state/transitions')
  getAvailableTransitions(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentService.getAvailableTransitions(id);
  }

  @Post(':id/state/validate')
  validateStateTransition(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { targetStatus: string }
  ) {
    return this.tournamentService.validateStateTransition(
      id,
      body.targetStatus as TournamentStatus
    );
  }

  @Public()
  @Get(':id/matches')
  getTournamentMatches(
    @Param('id', ParseIntPipe) id: number,
    @Query('round', ParseIntPipe) round?: number,
    @Query('status') status?: string
  ) {
    return this.tournamentService.getTournamentMatches(id, { round, status });
  }

  @Public()
  @Get(':id/matches/:matchId')
  getTournamentMatch(
    @Param('id', ParseIntPipe) id: number,
    @Param('matchId', ParseIntPipe) matchId: number
  ) {
    return this.tournamentService.getTournamentMatch(id, matchId);
  }

  @Get(':id/registrations')
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(
    OrganizerRole.OWNER,
    OrganizerRole.ADMIN,
    OrganizerRole.MODERATOR
  )
  getTournamentRegistrations(
    @Param('id', ParseIntPipe) id: number,
    @Query('status') status?: string
  ) {
    return this.tournamentService.getTournamentRegistrations(id, status);
  }

  @Patch(':id/registrations/:registrationId/confirm')
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(
    OrganizerRole.OWNER,
    OrganizerRole.ADMIN,
    OrganizerRole.MODERATOR
  )
  confirmRegistration(
    @Param('id', ParseIntPipe) id: number,
    @Param('registrationId', ParseIntPipe) registrationId: number
  ) {
    return this.tournamentService.confirmRegistration(id, registrationId);
  }

  @Patch(':id/registrations/:registrationId/cancel')
  @UseGuards(TournamentOrganizerGuard)
  @TournamentOrganizerRoles(
    OrganizerRole.OWNER,
    OrganizerRole.ADMIN,
    OrganizerRole.MODERATOR
  )
  cancelRegistration(
    @Param('id', ParseIntPipe) id: number,
    @Param('registrationId', ParseIntPipe) registrationId: number,
    @Body() body?: { reason?: string }
  ) {
    return this.tournamentService.cancelRegistration(
      id,
      registrationId,
      body?.reason
    );
  }

  @Patch(':id/registrations/:registrationId/check-in')
  checkInPlayer(
    @Param('id', ParseIntPipe) id: number,
    @Param('registrationId', ParseIntPipe) registrationId: number,
    @CurrentUser() user: User
  ) {
    return this.tournamentService.checkInPlayer(id, registrationId, user.id);
  }
}
