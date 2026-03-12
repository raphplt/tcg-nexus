import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Card } from "../card/entities/card.entity";
import { Deck } from "../deck/entities/deck.entity";
import { Player } from "../player/entities/player.entity";
import { Ranking } from "../ranking/entities/ranking.entity";
import { Statistics } from "../statistics/entities/statistic.entity";
import { Tournament } from "../tournament/entities/tournament.entity";
import { TournamentOrganizer } from "../tournament/entities/tournament-organizer.entity";
import { TournamentRegistration } from "../tournament/entities/tournament-registration.entity";
import { Match } from "./entities/match.entity";
import { OnlineMatchSession } from "./entities/online-match-session.entity";
import { MatchPermissionGuard } from "./guards/match-permission.guard";
import { MatchController } from "./match.controller";
import { MatchGateway } from "./match.gateway";
import { MatchOnlineController } from "./match-online.controller";
import { MatchOnlineService } from "./online/match-online.service";
import { MatchService } from "./match.service";

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    TypeOrmModule.forFeature([
      Match,
      OnlineMatchSession,
      Tournament,
      Player,
      TournamentRegistration,
      TournamentOrganizer,
      Ranking,
      Statistics,
      Deck,
      Card,
    ]),
  ],
  controllers: [MatchController, MatchOnlineController],
  providers: [MatchService, MatchOnlineService, MatchPermissionGuard, MatchGateway],
  exports: [MatchService, MatchOnlineService, MatchGateway],
})
export class MatchModule {}
