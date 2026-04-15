import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Match } from "../match/entities/match.entity";
import { Player } from "../player/entities/player.entity";
import { Tournament } from "../tournament/entities/tournament.entity";
import { Ranking } from "./entities/ranking.entity";
import { RankingController } from "./ranking.controller";
import { RankingService } from "./ranking.service";

@Module({
  imports: [TypeOrmModule.forFeature([Ranking, Tournament, Player, Match])],
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService],
})
export class RankingModule {}
