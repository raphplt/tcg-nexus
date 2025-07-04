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
      Player
    ])
  ],
  controllers: [TournamentController],
  providers: [TournamentService],
  exports: [TournamentService]
})
export class TournamentModule {}
