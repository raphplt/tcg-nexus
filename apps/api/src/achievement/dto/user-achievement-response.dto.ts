import { Achievement } from '../entities/achievement.entity';

export class UserAchievementResponseDto {
  id: number;
  userId: number;
  achievement: Achievement;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Informations calculées
  progressPercentage?: number;

  constructor(partial: Partial<UserAchievementResponseDto>) {
    Object.assign(this, partial);

    // Calculer le pourcentage de progression
    if (this.achievement && this.achievement.target > 0) {
      this.progressPercentage = Math.min(
        100,
        Math.round((this.progress / this.achievement.target) * 100)
      );
    }
  }
}

