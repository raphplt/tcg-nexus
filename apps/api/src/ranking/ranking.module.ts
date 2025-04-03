import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { Ranking } from './entities/ranking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ranking])],
  controllers: [RankingController],
  providers: [RankingService]
})
export class RankingModule {}
