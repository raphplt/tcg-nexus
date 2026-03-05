import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Player } from "../player/entities/player.entity";
import { Ranking } from "../ranking/entities/ranking.entity";
import { Statistics } from "../statistics/entities/statistic.entity";
import { Tournament } from "../tournament/entities/tournament.entity";
import { TournamentOrganizer } from "../tournament/entities/tournament-organizer.entity";
import { TournamentRegistration } from "../tournament/entities/tournament-registration.entity";
import { Match } from "./entities/match.entity";
import { MatchPermissionGuard } from "./guards/match-permission.guard";
import { MatchController } from "./match.controller";
import { MatchGateway } from "./match.gateway";
import { MatchService } from "./match.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Match,
      Tournament,
      Player,
      TournamentRegistration,
      TournamentOrganizer,
      Ranking,
      Statistics,
    ]),
  ],
  controllers: [MatchController],
  providers: [MatchService, MatchPermissionGuard, MatchGateway],
  exports: [MatchService, MatchGateway],
})
export class MatchModule {}
