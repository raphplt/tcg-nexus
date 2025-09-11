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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import {
  TournamentOrganizerGuard,
  TournamentParticipantGuard,
  TournamentOwnerGuard,
  TournamentOrganizerRoles
} from './guards';
import { OrganizerRole } from './entities/tournament-organizer.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

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

  @Get()
  async findAll(@Query() query: TournamentQueryDto) {
    return this.tournamentService.findAll(query);
  }

  @Get('upcoming')
  async getUpcomingTournaments(@Query('limit') limit?: number) {
    return this.tournamentService.getUpcomingTournaments(limit);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentService.findOne(id);
  }

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
    @Param('playerId', ParseIntPipe) playerId: number
  ) {
    return this.tournamentService.getPlayerTournaments(playerId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TournamentOwnerGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentService.remove(id);
  }
}
