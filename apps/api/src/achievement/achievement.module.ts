import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { AchievementService } from './achievement.service';
import { AchievementController } from './achievement.controller';
import { AchievementEventsService } from './achievement-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([Achievement, UserAchievement])],
  controllers: [AchievementController],
  providers: [AchievementService, AchievementEventsService],
  exports: [AchievementService, AchievementEventsService] // Export pour utiliser dans d'autres modules
})
export class AchievementModule {}

