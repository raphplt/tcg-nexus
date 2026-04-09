import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeController } from './challenge.controller';
import { ChallengeService } from './challenge.service';
import { Challenge } from './entities/challenge.entity';
import { ActiveChallenge } from './entities/active-challenge.entity';
import { UserChallenge } from './entities/user-challenge.entity';
import { Player } from '../player/entities/player.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Challenge, ActiveChallenge, UserChallenge, Player])],
  controllers: [ChallengeController],
  providers: [ChallengeService],
  exports: [ChallengeService],
})
export class ChallengeModule {}
