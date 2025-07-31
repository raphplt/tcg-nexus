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
  ParseIntPipe
} from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentQueryDto } from './dto/tournament-query.dto';
import { UpdateTournamentStatusDto } from './dto/update-tournament-status.dto';
import { TournamentRegistrationDto } from './dto/tournament-registration.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('tournaments')
@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Post()
  async create(@Body() createTournamentDto: CreateTournamentDto) {
    return this.tournamentService.create(createTournamentDto);
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTournamentDto: UpdateTournamentDto
  ) {
    return this.tournamentService.update(id, updateTournamentDto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateTournamentStatusDto
  ) {
    return this.tournamentService.updateStatus(id, updateStatusDto);
  }

  @Post(':id/register')
  @HttpCode(HttpStatus.CREATED)
  async registerPlayer(
    @Param('id', ParseIntPipe) id: number,
    @Body() registrationDto: Omit<TournamentRegistrationDto, 'tournamentId'>
  ) {
    const fullRegistrationDto: TournamentRegistrationDto = {
      ...registrationDto,
      tournamentId: id
    };
    return this.tournamentService.registerPlayer(fullRegistrationDto);
  }

  @Delete(':id/register/:playerId')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentService.remove(id);
  }
}
