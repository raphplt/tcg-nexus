import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { Ranking } from './entities/ranking.entity';
import { Tournament } from '../tournament/entities/tournament.entity';
import { Player } from '../player/entities/player.entity';
import { Match } from '../match/entities/match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ranking, Tournament, Player, Match])],
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService]
})
export class RankingModule {}
