import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe
} from '@nestjs/common';
import { MatchQueryDto, MatchService } from './match.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import {
  ReportScoreDto,
  StartMatchDto,
  ResetMatchDto
} from './dto/match-operations.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { MatchPermissionGuard } from './guards/match-permission.guard';

@ApiTags('matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('matches')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post()
  create(@Body() createMatchDto: CreateMatchDto) {
    return this.matchService.create(createMatchDto);
  }

  @Get()
  findAll(@Query() query: MatchQueryDto) {
    return this.matchService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.matchService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMatchDto: UpdateMatchDto
  ) {
    return this.matchService.update(id, updateMatchDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.matchService.remove(id);
  }

  // ============= MATCH OPERATIONS =============

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MatchPermissionGuard)
  async startMatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() startMatchDto: StartMatchDto
  ) {
    return this.matchService.startMatch(id, startMatchDto);
  }

  @Post(':id/report-score')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MatchPermissionGuard)
  async reportScore(
    @Param('id', ParseIntPipe) id: number,
    @Body() reportScoreDto: ReportScoreDto
  ) {
    return this.matchService.reportScore(id, reportScoreDto);
  }

  @Post(':id/reset')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MatchPermissionGuard)
  async resetMatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() resetMatchDto: ResetMatchDto
  ) {
    return this.matchService.resetMatch(id, resetMatchDto);
  }

  // ============= MATCH QUERIES =============

  @Get('tournament/:tournamentId/round/:round')
  async getMatchesByRound(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('round', ParseIntPipe) round: number
  ) {
    return this.matchService.getMatchesByRound(tournamentId, round);
  }

  @Get('player/:playerId/tournament/:tournamentId')
  async getPlayerMatches(
    @Param('playerId', ParseIntPipe) playerId: number,
    @Param('tournamentId', ParseIntPipe) tournamentId: number
  ) {
    return this.matchService.getPlayerMatches(tournamentId, playerId);
  }
}
