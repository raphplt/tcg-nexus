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
import {
  TournamentOrganizerGuard,
  TournamentParticipantGuard,
  TournamentOwnerGuard
} from './guards';

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
      User
    ])
  ],
  controllers: [TournamentController],
  providers: [
    TournamentService,
    TournamentOrganizerGuard,
    TournamentParticipantGuard,
    TournamentOwnerGuard
  ],
  exports: [TournamentService]
})
export class TournamentModule {}
