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
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
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

@ApiTags("matches")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("matches")
export class MatchController {
  constructor(
    private readonly matchService: MatchService,
    private readonly matchResultService: MatchResultService,
  ) {}

  @Get("play-hub")
  getPlayHub(@CurrentUser() user: User) {
    return this.matchService.getPlayHub(user.id);
  }

  @Post()
  @UseGuards(MatchPermissionGuard)
  create(@Body() createMatchDto: CreateMatchDto) {
    return this.matchService.create(createMatchDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  findAll(@Query() query: MatchQueryDto) {
    return this.matchService.findAll(query);
  }

  @Get(":id")
  @UseGuards(MatchPermissionGuard)
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.matchService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(MatchPermissionGuard)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateMatchDto: UpdateMatchDto,
  ) {
    return this.matchService.update(id, updateMatchDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(MatchPermissionGuard)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.matchService.remove(id);
  }

  @Post(":id/start")
  @HttpCode(HttpStatus.OK)
  @UseGuards(MatchPermissionGuard)
  startMatch(
    @Param("id", ParseIntPipe) id: number,
    @Body() startMatchDto: StartMatchDto,
  ) {
    return this.matchService.startMatch(id, startMatchDto);
  }

  @Post(":id/report-score")
  @HttpCode(HttpStatus.OK)
  @UseGuards(MatchPermissionGuard)
  reportScore(
    @Param("id", ParseIntPipe) id: number,
    @Body() reportScoreDto: ReportScoreDto,
  ) {
    return this.matchService.reportScore(id, reportScoreDto);
  }

  @Post(":id/reset")
  @HttpCode(HttpStatus.OK)
  @UseGuards(MatchPermissionGuard)
  resetMatch(
    @Param("id", ParseIntPipe) id: number,
    @Body() resetMatchDto: ResetMatchDto,
  ) {
    return this.matchService.resetMatch(id, resetMatchDto);
  }

  @Get("tournament/:tournamentId/round/:round")
  getMatchesByRound(
    @Param("tournamentId", ParseIntPipe) tournamentId: number,
    @Param("round", ParseIntPipe) round: number,
  ) {
    return this.matchService.getMatchesByRound(tournamentId, round);
  }

  @Get("player/:playerId/tournament/:tournamentId")
  getPlayerMatches(
    @Param("playerId", ParseIntPipe) playerId: number,
    @Param("tournamentId", ParseIntPipe) tournamentId: number,
  ) {
    return this.matchService.getPlayerMatches(tournamentId, playerId);
  }

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

  @Get(":id/proposals")
  @UseGuards(MatchPermissionGuard)
  getProposals(@Param("id", ParseIntPipe) id: number) {
    return this.matchResultService.getMatchProposals(id);
  }
}
