import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentService } from './tournament.service';
import { TournamentController } from './tournament.controller';
import {
  Tournament,
  TournamentRegistration,
  TournamentReward,
  TournamentPricing,
  TournamentOrganizer,
  TournamentNotification,
  RegistrationPayment
} from './entities';
import { Player } from '../player/entities/player.entity';
import { User } from '../user/entities/user.entity';
import { Match } from '../match/entities/match.entity';
import { Ranking } from '../ranking/entities/ranking.entity';
import {
  TournamentOrganizerGuard,
  TournamentParticipantGuard,
  TournamentOwnerGuard
} from './guards';
import { BracketService } from './services/bracket.service';
import { SeedingService } from './services/seeding.service';
import { TournamentOrchestrationService } from './services/tournament-orchestration.service';
import { TournamentStateService } from './services/tournament-state.service';
import { RankingModule } from '../ranking/ranking.module';
import { MatchModule } from '../match/match.module';
import { MatchService } from '../match/match.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tournament,
      TournamentRegistration,
      TournamentReward,
      TournamentPricing,
      TournamentOrganizer,
      TournamentNotification,
      RegistrationPayment,
      Player,
      User,
      Match,
      Ranking
    ]),
    RankingModule,
    MatchModule
  ],
  controllers: [TournamentController],
  providers: [
    TournamentService,
    BracketService,
    SeedingService,
    TournamentOrchestrationService,
    TournamentStateService,
    TournamentOrganizerGuard,
    TournamentParticipantGuard,
    TournamentOwnerGuard
  ],
  exports: [
    TournamentService,
    BracketService,
    SeedingService,
    TournamentOrchestrationService,
    TournamentStateService
  ]
})
export class TournamentModule {}
