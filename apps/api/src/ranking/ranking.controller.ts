import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { CreateRankingDto } from "./dto/create-ranking.dto";
import { UpdateRankingDto } from "./dto/update-ranking.dto";
import { RankingService } from "./ranking.service";

@ApiTags("ranking")
@Controller("ranking")
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Post()
  create(@Body() createRankingDto: CreateRankingDto) {
    return this.rankingService.create(createRankingDto);
  }

  @Get()
  findAll() {
    return this.rankingService.findAll();
  }

  @Get("elo/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.rankingService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateRankingDto: UpdateRankingDto) {
    return this.rankingService.update(+id, updateRankingDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.rankingService.remove(+id);
  }
}
