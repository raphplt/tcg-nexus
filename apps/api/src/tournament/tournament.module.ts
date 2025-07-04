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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tournament,
      TournamentRegistration,
      TournamentReward,
      TournamentPricing,
      TournamentOrganizer,
      TournamentNotification,
      RegistrationPayment
    ])
  ],
  controllers: [TournamentController],
  providers: [TournamentService],
  exports: [TournamentService]
})
export class TournamentModule {}
