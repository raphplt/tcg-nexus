import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { Match } from './entities/match.entity';
import { Tournament } from '../tournament/entities/tournament.entity';
import { Player } from '../player/entities/player.entity';
import { TournamentRegistration } from '../tournament/entities/tournament-registration.entity';
import { TournamentOrganizer } from '../tournament/entities/tournament-organizer.entity';
import { Ranking } from '../ranking/entities/ranking.entity';
import { Statistics } from '../statistics/entities/statistic.entity';
import { MatchPermissionGuard } from './guards/match-permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Match,
      Tournament,
      Player,
      TournamentRegistration,
      TournamentOrganizer,
      Ranking,
      Statistics
    ])
  ],
  controllers: [MatchController],
  providers: [MatchService, MatchPermissionGuard],
  exports: [MatchService]
})
export class MatchModule {}
