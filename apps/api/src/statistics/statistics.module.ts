import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { Statistics } from './entities/statistic.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Statistics])],
  controllers: [StatisticsController],
  providers: [StatisticsService]
})
export class StatisticsModule {}
