import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Match } from "../match/entities/match.entity";
import { Player } from "../player/entities/player.entity";
import { Tournament } from "../tournament/entities/tournament.entity";
import { SwissPairingModule } from "../tournament/swiss-pairing.module";
import { RankedMatchHistory } from "./entities/ranked-match-history.entity";
import { Ranking } from "./entities/ranking.entity";
import { RankingController } from "./ranking.controller";
import { RankingService } from "./ranking.service";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Ranking,
      RankedMatchHistory,
      Tournament,
      Player,
      Match,
    ]),
    SwissPairingModule,
  ],
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService],
})
export class RankingModule {}
