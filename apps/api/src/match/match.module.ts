import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Card } from "../card/entities/card.entity";
import { Deck } from "../deck/entities/deck.entity";
import { SavedDeck } from "../deck/entities/saved-deck.entity";
import { Player } from "../player/entities/player.entity";
import { Ranking } from "../ranking/entities/ranking.entity";
import { Statistics } from "../statistics/entities/statistic.entity";
import { Tournament } from "../tournament/entities/tournament.entity";
import { TournamentOrganizer } from "../tournament/entities/tournament-organizer.entity";
import { TournamentRegistration } from "../tournament/entities/tournament-registration.entity";
import { User } from "../user/entities/user.entity";
import { CasualMatchController } from "./casual-match.controller";
import { CasualMatchService } from "./casual/casual-match.service";
import { MatchmakingService } from "./casual/matchmaking.service";
import { CasualMatchSession } from "./entities/casual-match-session.entity";
import { Match } from "./entities/match.entity";
import { OnlineMatchSession } from "./entities/online-match-session.entity";
import { TrainingMatchSession } from "./entities/training-match-session.entity";
import { MatchPermissionGuard } from "./guards/match-permission.guard";
import { MatchController } from "./match.controller";
import { MatchGateway } from "./match.gateway";
import { MatchOnlineController } from "./match-online.controller";
import { TrainingMatchController } from "./training-match.controller";
import { MatchOnlineService } from "./online/match-online.service";
import { OnlinePlaySupportService } from "./online/online-play-support.service";
import { MatchService } from "./match.service";
import { TrainingAiService } from "./training/training-ai.service";
import { TrainingMatchService } from "./training/training-match.service";

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    TypeOrmModule.forFeature([
      Match,
      OnlineMatchSession,
      TrainingMatchSession,
      CasualMatchSession,
      Tournament,
      Player,
      TournamentRegistration,
      TournamentOrganizer,
      Ranking,
      Statistics,
      Deck,
      SavedDeck,
      Card,
      User,
    ]),
  ],
  controllers: [
    MatchController,
    MatchOnlineController,
    TrainingMatchController,
    CasualMatchController,
  ],
  providers: [
    MatchService,
    MatchOnlineService,
    TrainingMatchService,
    CasualMatchService,
    MatchmakingService,
    OnlinePlaySupportService,
    TrainingAiService,
    MatchPermissionGuard,
    MatchGateway,
  ],
  exports: [
    MatchService,
    MatchOnlineService,
    TrainingMatchService,
    CasualMatchService,
    MatchmakingService,
    OnlinePlaySupportService,
    MatchGateway,
  ],
})
export class MatchModule {}
