import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerService } from './player.service';
import { PlayerController } from './player.controller';
import { Player } from './entities/player.entity';
import { User } from 'src/user/entities/user.entity';
import { Ranking } from 'src/ranking/entities/ranking.entity';
import { Tournament } from 'src/tournament/entities/tournament.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Player, User, Ranking, Tournament])],
  controllers: [PlayerController],
  providers: [PlayerService]
})
export class PlayerModule {}
